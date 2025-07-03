import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	journalEntry,
	journalEntryLine,
	chartOfAccount,
	fiscalPeriod,
	user
} from '$lib/server/db/schema';
import { eq, and, desc, asc, gte, lte, sql, count, inArray } from 'drizzle-orm';
import * as XLSX from 'xlsx';

// Helper function to generate next journal number based on date
async function generateNextJournalNumber(inputDate: string) {
	const date = new Date(inputDate);
	const year = date.getFullYear().toString().slice(-2);
	const month = (date.getMonth() + 1).toString().padStart(2, '0');

	const prefix = `JV-${year}${month}`;

	const lastEntry = await db.query.journalEntry.findFirst({
		where: sql`${journalEntry.number} LIKE ${prefix + '%'}`,
		orderBy: [desc(journalEntry.number)]
	});

	if (lastEntry) {
		const lastSequence = parseInt(lastEntry.number.substring(8) || '0');
		const newSequence = (lastSequence + 1).toString().padStart(4, '0');
		return prefix + newSequence;
	} else {
		return `${prefix}0001`;
	}
}

export const load: PageServerLoad = async ({ url, locals }) => {
	try {
		// Get filter parameters from URL
		const startDate = url.searchParams.get('startDate') || '';
		const endDate = url.searchParams.get('endDate') || '';
		const status = url.searchParams.get('status') || '';
		const searchTerm = url.searchParams.get('search') || '';
		const fiscalPeriodId = url.searchParams.get('fiscalPeriodId') || '';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const offset = (page - 1) * limit;

		// Build filter conditions
		const conditions = [];

		if (startDate) {
			conditions.push(gte(journalEntry.date, startDate));
		}

		if (endDate) {
			conditions.push(lte(journalEntry.date, endDate));
		}

		if (status) {
			conditions.push(eq(journalEntry.status, status));
		}

		if (fiscalPeriodId) {
			conditions.push(eq(journalEntry.fiscalPeriodId, parseInt(fiscalPeriodId)));
		}

		if (searchTerm) {
			conditions.push(
				sql`(${journalEntry.number} LIKE ${'%' + searchTerm + '%'} OR ${journalEntry.description} LIKE ${'%' + searchTerm + '%'})`
			);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// Get total count of entries
		const totalEntriesResult = await db
			.select({ count: count() })
			.from(journalEntry)
			.where(whereClause);
		const totalEntries = totalEntriesResult[0].count;

		// Get journal entries with filters
		const entries = await db.query.journalEntry.findMany({
			where: whereClause,
			with: {
				fiscalPeriod: true,
				createdByUser: true,
				postedByUser: true,
				lines: {
					with: {
						account: true
					},
					orderBy: [asc(journalEntryLine.lineNumber)]
				}
			},
			orderBy: [desc(journalEntry.date), desc(journalEntry.number)],
			limit,
			offset
		});

		// Get accounts for dropdown
		const accounts = await db.query.chartOfAccount.findMany({
			where: eq(chartOfAccount.isActive, true),
			orderBy: [asc(chartOfAccount.code)]
		});

		// Get fiscal periods for dropdown
		const fiscalPeriods = await db.query.fiscalPeriod.findMany({
			orderBy: [desc(fiscalPeriod.startDate)]
		});

		// Get current fiscal period (first active one)
		const currentFiscalPeriod = await db.query.fiscalPeriod.findFirst({
			where: eq(fiscalPeriod.isClosed, false),
			orderBy: [asc(fiscalPeriod.startDate)]
		});

		// Generate default journal number for today
		const today = new Date().toISOString().split('T')[0];
		const nextJournalNumber = await generateNextJournalNumber(today);

		return {
			entries,
			accounts,
			fiscalPeriods,
			currentFiscalPeriod,
			nextJournalNumber,
			filters: {
				startDate,
				endDate,
				status,
				searchTerm,
				fiscalPeriodId
			},
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalEntries / limit)
			}
		};
	} catch (err) {
		console.error('Error loading journal entries:', err);
		throw error(500, 'Failed to load journal entries');
	}
};

export const actions: Actions = {
	import: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to import journals' });
		}

		const formData = await request.formData();
		const file = formData.get('excelFile') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'No file uploaded' });
		}

		try {
			const buffer = await file.arrayBuffer();
			const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];

			const rows = XLSX.utils.sheet_to_json(sheet, {
				header: 1,
				defval: null,
				blankrows: false
			}) as any[][];

			// Skip the first row which contains the messy headers
			const dataRows = rows.slice(1);

			console.log(`[Import] Found ${dataRows.length} data rows in Excel.`);

			const journalData: any[] = [];
			let currentJournal: any = null;

			for (const row of dataRows) {
				if (!row || row.length === 0) continue; // Skip empty rows

				const firstCol = row[0] ? String(row[0]).trim() : '';
				const secondCol = row[1] ? String(row[1]).trim() : '';

				const isHeader =
					(row[0] instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(firstCol)) &&
					secondCol.startsWith('JV');

				if (isHeader) {
					if (currentJournal) {
						journalData.push(currentJournal);
					}
					currentJournal = {
						date: new Date(firstCol),
						number: secondCol,
						reference: row[2] || '',
						description: row[3] || '',
						lines: []
					};
				} else if (currentJournal && !isNaN(parseInt(firstCol))) {
					currentJournal.lines.push({
						'Kode Akun': firstCol,
						'Deskripsi Baris': [row[1], row[2], row[3]].filter(Boolean).join(' - '),
						Debit: parseFloat(row[4]) || 0,
						Kredit: parseFloat(row[5]) || 0
					});
				} else if (firstCol.toLowerCase().startsWith('total')) {
					if (currentJournal) {
						journalData.push(currentJournal);
					}
					currentJournal = null;
				}
			}

			if (currentJournal) {
				journalData.push(currentJournal);
			}

			console.log(`[Import] Parsed ${journalData.length} journal entries from the file.`);

			if (journalData.length === 0) {
				return fail(400, {
					error:
						'No valid journal entries could be parsed. Please check the file format and content.'
				});
			}

			const allAccountCodes = [
				...new Set(journalData.flatMap((j) => j.lines.map((l: any) => l['Kode Akun'])))
			];
			const accountsInDb = await db.query.chartOfAccount.findMany({
				where: inArray(chartOfAccount.code, allAccountCodes)
			});
			const accountMap = new Map(accountsInDb.map((acc) => [String(acc.code), acc.id]));
			console.log(`[Import] Found ${accountMap.size} matching accounts in the database.`);

			const activeFiscalPeriods = await db.query.fiscalPeriod.findMany({
				where: eq(fiscalPeriod.isClosed, false),
				orderBy: [asc(fiscalPeriod.startDate)]
			});
			console.log(`[Import] Found ${activeFiscalPeriods.length} active fiscal periods.`);

			await db.transaction(async (tx) => {
				console.log('[Import] Starting database transaction.');
				for (const entry of journalData) {
					console.log(`[Import] Processing journal number: ${entry.number}`);

					const period = activeFiscalPeriods.find(
						(p) => entry.date >= new Date(p.startDate) && entry.date <= new Date(p.endDate)
					);
					if (!period)
						throw new Error(
							`No active fiscal period for date ${entry.date.toISOString().split('T')[0]} in journal ${entry.number}.`
						);

					let totalDebit = 0;
					let totalCredit = 0;
					const journalLines = [];

					for (const [i, line] of entry.lines.entries()) {
						const accountCode = String(line['Kode Akun']);
						const accountId = accountMap.get(accountCode);
						if (!accountId)
							throw new Error(
								`Account with code "${accountCode}" not found for journal ${entry.number}.`
							);

						const debit = parseFloat(line['Debit'] || 0);
						const credit = parseFloat(line['Kredit'] || 0);
						totalDebit += debit;
						totalCredit += credit;

						journalLines.push({
							accountId,
							description: line['Deskripsi Baris'] || '',
							debitAmount: debit,
							creditAmount: credit,
							lineNumber: i + 1
						});
					}

					if (Math.abs(totalDebit - totalCredit) > 0.01)
						throw new Error(
							`Journal ${entry.number} is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`
						);

					const newEntryResult = await tx
						.insert(journalEntry)
						.values({
							number: entry.number,
							date: entry.date,
							description: entry.description,
							reference: entry.reference,
							fiscalPeriodId: period.id,
							status: 'POSTED',
							totalDebit,
							totalCredit,
							createdBy: locals.user.id,
							postedAt: new Date(),
							postedBy: locals.user.id
						})
						.returning({ id: journalEntry.id });
					const journalEntryId = newEntryResult[0].id;
					console.log(`[Import] Inserted journal entry ID: ${journalEntryId}`);

					await tx
						.insert(journalEntryLine)
						.values(journalLines.map((line) => ({ ...line, journalEntryId })));
					console.log(`[Import] Inserted lines for entry ID: ${journalEntryId}`);
				}
				console.log('[Import] Database transaction committed.');
			});

			return { success: true };
		} catch (err) {
			console.error('Error importing journal entries:', err);
			const errorMessage =
				err instanceof Error ? err.message : 'An unknown error occurred during import.';
			return fail(500, { error: `Failed to import journal entries: ${errorMessage}` });
		}
	},

	// The rest of the actions (generateJournalNumber, create, delete, update) remain unchanged.
	generateJournalNumber: async ({ request }) => {
		const formData = await request.formData();
		const date = formData.get('date') as string;

		if (!date) {
			return fail(400, { error: 'Date is required' });
		}

		try {
			const journalNumber = await generateNextJournalNumber(date);
			return { success: true, journalNumber };
		} catch (err) {
			console.error('Error generating journal number:', err);
			return fail(500, { error: 'Failed to generate journal number' });
		}
	},

	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to create journal entries' });
		}

		const formData = await request.formData();

		const number = formData.get('number') as string;
		const date = formData.get('date') as string;
		const description = formData.get('description') as string;
		const reference = formData.get('reference') as string;
		const fiscalPeriodId = parseInt(formData.get('fiscalPeriodId') as string);

		// Parse journal lines
		const lineCount = parseInt(formData.get('lineCount') as string);
		const journalLines = [];

		let totalDebit = 0;
		let totalCredit = 0;

		for (let i = 0; i < lineCount; i++) {
			const accountIdValue = formData.get(`lines[${i}].accountId`);
			// Skip empty account IDs
			if (!accountIdValue) continue;

			const accountId = parseInt(accountIdValue as string);
			const lineDescription = formData.get(`lines[${i}].description`) as string;
			const debitAmount = parseFloat((formData.get(`lines[${i}].debitAmount`) as string) || '0');
			const creditAmount = parseFloat((formData.get(`lines[${i}].creditAmount`) as string) || '0');

			if (accountId && (debitAmount > 0 || creditAmount > 0)) {
				journalLines.push({
					accountId,
					description: lineDescription,
					debitAmount,
					creditAmount,
					lineNumber: i + 1
				});

				totalDebit += debitAmount;
				totalCredit += creditAmount;
			}
		}

		// Validate the entry
		if (journalLines.length < 2 && !formData.get('isbhp')) {
			return fail(400, {
				error: 'Journal entry must have at least two lines',
				values: Object.fromEntries(formData)
			});
		}

		// Check if total debits equal total credits
		if (Math.abs(totalDebit - totalCredit) > 0.01) {
			return fail(400, {
				error: 'Total debits must equal total credits',
				values: Object.fromEntries(formData),
				totalDebit,
				totalCredit
			});
		}

		try {
			// Generate journal number based on the actual date entered
			const generatedNumber = await generateNextJournalNumber(date);

			// Use generated number instead of form input
			const finalNumber = generatedNumber;

			// Check if journal number already exists
			const existingEntry = await db.query.journalEntry.findFirst({
				where: eq(journalEntry.number, finalNumber)
			});

			if (existingEntry) {
				return fail(400, {
					error: 'Journal entry number already exists',
					values: Object.fromEntries(formData)
				});
			}
			// Create journal entry with POSTED status directly
			const result = await db
				.insert(journalEntry)
				.values({
					number: finalNumber,
					date: new Date(date),
					description,
					reference,
					fiscalPeriodId,
					status: 'POSTED', // Auto post the journal entry
					totalDebit,
					totalCredit,
					createdBy: locals.user.id,
					postedAt: new Date(), // Set posted date
					postedBy: locals.user.id // Set posted by
				})
				.returning({ id: journalEntry.id });

			if (!result || result.length === 0) {
				throw new Error('Failed to create journal entry');
			}

			const journalEntryId = result[0].id;

			// Create journal lines
			for (const line of journalLines) {
				await db.insert(journalEntryLine).values({
					journalEntryId,
					accountId: line.accountId,
					description: line.description,
					debitAmount: line.debitAmount,
					creditAmount: line.creditAmount,
					lineNumber: line.lineNumber
				});
			}

			const isResellerTransaction = journalLines.some(
				(line) => line.accountId === 115 && line.creditAmount > 0
			);

			if (isResellerTransaction) {
				const komBagiHasil = totalCredit;
				const pendapatan = komBagiHasil * 1.5;
				console.log('pendapatan', komBagiHasil * 1.5);
				const pendapatanRetail = pendapatan / 1.11;
				console.log('pendapatan retail', pendapatan / 1.11);
				const ppnKeluaran = pendapatanRetail * 0.11;
				const biayaAdmin = pendapatanRetail * 0.01;
				const kurangBayarBhpUso = pendapatanRetail * 0.0175 - komBagiHasil * 0.0175;

				const bagiHasil = pendapatan - komBagiHasil - ppnKeluaran - kurangBayarBhpUso - biayaAdmin;
				const pphDuaSatu = bagiHasil * 0.01;
				const piutangUsaha =
					komBagiHasil + ppnKeluaran + kurangBayarBhpUso + pphDuaSatu + biayaAdmin;

				const result2 = await db
					.insert(journalEntry)
					.values({
						number: 'b' + finalNumber,
						date: new Date(date),
						description,
						reference,
						fiscalPeriodId,
						status: 'POSTED', // Auto post the journal entry
						totalDebit: piutangUsaha + bagiHasil,
						totalCredit: pendapatanRetail + ppnKeluaran + pphDuaSatu,
						createdBy: locals.user.id,
						postedAt: new Date(), // Set posted date
						postedBy: locals.user.id // Set posted by
					})
					.returning({ id: journalEntry.id });

				const journalLine2 = [
					{
						accountId: 94,
						description: 'Piutang Usaha',
						debitAmount: piutangUsaha,
						creditAmount: 0,
						lineNumber: 1
					},
					{
						accountId: 46,
						description: 'Beban Gaji Pegawai',
						debitAmount: bagiHasil,
						creditAmount: 0,
						lineNumber: 2
					},
					{
						accountId: 115,
						description: 'Pendapatan Retail',
						debitAmount: 0, // Total Laba Kotor di sisi DEBIT
						creditAmount: pendapatanRetail,
						lineNumber: 3
					},
					{
						accountId: 30,
						description: 'PPN Keluaran',
						debitAmount: 0,
						creditAmount: ppnKeluaran,
						lineNumber: 4
					},
					{
						accountId: 28,
						description: 'PPH Pasal 21',
						debitAmount: 0,
						creditAmount: pphDuaSatu,
						lineNumber: 5
					}
				];

				const journalEntryId2 = result2[0].id;
				for (const line2 of journalLine2) {
					await db.insert(journalEntryLine).values({
						journalEntryId: journalEntryId2,
						accountId: line2.accountId,
						description: line2.description,
						debitAmount: line2.debitAmount,
						creditAmount: line2.creditAmount,
						lineNumber: line2.lineNumber
					});
				}
			}

			return { success: true, journalEntryId };
		} catch (err) {
			console.error('Error creating journal entry:', err);
			return fail(500, {
				error: 'Failed to create journal entry',
				values: Object.fromEntries(formData)
			});
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const journalEntryId = parseInt(formData.get('id') as string);

		try {
			// Get the journal entry
			const entryToDelete = await db.query.journalEntry.findFirst({
				where: eq(journalEntry.id, journalEntryId)
			});

			if (!entryToDelete) {
				return fail(404, { error: 'Journal entry not found' });
			}

			// Delete journal lines first
			await db.delete(journalEntryLine).where(eq(journalEntryLine.journalEntryId, journalEntryId));

			// Then delete the journal entry
			await db.delete(journalEntry).where(eq(journalEntry.id, journalEntryId));

			return { success: true };
		} catch (err) {
			console.error('Error deleting journal entry:', err);
			return fail(500, { error: 'Failed to delete journal entry' });
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to update journal entries' });
		}

		const formData = await request.formData();
		const journalEntryId = parseInt(formData.get('id') as string);
		const description = formData.get('description') as string;
		const reference = formData.get('reference') as string;
		const date = formData.get('date') as string;
		const fiscalPeriodId = parseInt(formData.get('fiscalPeriodId') as string);

		// Parse journal lines
		const lineCount = parseInt(formData.get('lineCount') as string);
		const journalLines = [];

		let totalDebit = 0;
		let totalCredit = 0;

		for (let i = 0; i < lineCount; i++) {
			const accountIdValue = formData.get(`lines[${i}].accountId`);
			if (!accountIdValue) continue;

			const accountId = parseInt(accountIdValue as string);
			const lineDescription = formData.get(`lines[${i}].description`) as string;
			const debitAmount = parseFloat((formData.get(`lines[${i}].debitAmount`) as string) || '0');
			const creditAmount = parseFloat((formData.get(`lines[${i}].creditAmount`) as string) || '0');

			if (accountId && (debitAmount > 0 || creditAmount > 0)) {
				journalLines.push({
					accountId,
					description: lineDescription,
					debitAmount,
					creditAmount,
					lineNumber: i + 1
				});

				totalDebit += debitAmount;
				totalCredit += creditAmount;
			}
		}

		// Validate the entry
		if (journalLines.length < 2) {
			return fail(400, {
				error: 'Journal entry must have at least two lines',
				values: Object.fromEntries(formData)
			});
		}

		// Check if total debits equal total credits
		if (Math.abs(totalDebit - totalCredit) > 0.01) {
			return fail(400, {
				error: 'Total debits must equal total credits',
				values: Object.fromEntries(formData),
				totalDebit,
				totalCredit
			});
		}

		try {
			// Get the journal entry
			const existingEntry = await db.query.journalEntry.findFirst({
				where: eq(journalEntry.id, journalEntryId)
			});

			if (!existingEntry) {
				return fail(404, { error: 'Journal entry not found' });
			}

			// Update journal entry - PERBAIKAN: pastikan tipe data sesuai dengan schema
			await db
				.update(journalEntry)
				.set({
					date: new Date(date), // Convert string to Date
					description,
					reference,
					fiscalPeriodId,
					totalDebit: totalDebit.toString(), // Convert to string if schema expects string
					totalCredit: totalCredit.toString(), // Convert to string if schema expects string
					updatedAt: new Date()
				})
				.where(eq(journalEntry.id, journalEntryId));

			// Delete existing lines
			await db.delete(journalEntryLine).where(eq(journalEntryLine.journalEntryId, journalEntryId));

			// Create new journal lines
			for (const line of journalLines) {
				await db.insert(journalEntryLine).values({
					journalEntryId,
					accountId: line.accountId,
					description: line.description,
					debitAmount: line.debitAmount,
					creditAmount: line.creditAmount,
					lineNumber: line.lineNumber
				});
			}

			return { success: true, journalEntryId };
		} catch (err) {
			console.error('Error updating journal entry:', err);
			return fail(500, {
				error: 'Failed to update journal entry',
				values: Object.fromEntries(formData)
			});
		}
	}
};
('');
