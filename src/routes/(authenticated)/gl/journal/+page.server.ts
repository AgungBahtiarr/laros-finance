import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { journalEntry, journalEntryLine, chartOfAccount, fiscalPeriod, user } from '$lib/server/db/schema';
import { eq, and, desc, asc, gte, lte, like, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, locals }) => {
	try {
		// Get filter parameters from URL
		const startDate = url.searchParams.get('startDate') || '';
		const endDate = url.searchParams.get('endDate') || '';
		const status = url.searchParams.get('status') || '';
		const searchTerm = url.searchParams.get('search') || '';
		const fiscalPeriodId = url.searchParams.get('fiscalPeriodId') || '';

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

		// Get journal entries with filters
		const entries = await db.query.journalEntry.findMany({
			where: conditions.length > 0 ? and(...conditions) : undefined,
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
			orderBy: [desc(journalEntry.date), desc(journalEntry.number)]
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

		// Get next journal entry number
		let nextJournalNumber = 'JE-00001';
		const lastEntry = await db.query.journalEntry.findFirst({
			orderBy: [desc(journalEntry.number)]
		});

		if (lastEntry) {
			const lastNumber = parseInt(lastEntry.number.replace('JE-', ''));
			nextJournalNumber = `JE-${(lastNumber + 1).toString().padStart(5, '0')}`;
		}

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
			}
		};
	} catch (err) {
		console.error('Error loading journal entries:', err);
		throw error(500, 'Failed to load journal entries');
	}
};

export const actions: Actions = {
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
			const accountId = parseInt(formData.get(`lines[${i}].accountId`) as string);
			const lineDescription = formData.get(`lines[${i}].description`) as string;
			const debitAmount = parseFloat(formData.get(`lines[${i}].debitAmount`) as string || '0');
			const creditAmount = parseFloat(formData.get(`lines[${i}].creditAmount`) as string || '0');

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
			// Check if journal number already exists
			const existingEntry = await db.query.journalEntry.findFirst({
				where: eq(journalEntry.number, number)
			});

			if (existingEntry) {
				return fail(400, {
					error: 'Journal entry number already exists',
					values: Object.fromEntries(formData)
				});
			}

			// Start a transaction
			// Create journal entry
			const result = await db.insert(journalEntry).values({
				number,
				date: new Date(date),
				description,
				reference,
				fiscalPeriodId,
				status: 'DRAFT',
				totalDebit,
				totalCredit,
				createdBy: locals.user.id
			}).returning({ id: journalEntry.id });

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

			return { success: true, journalEntryId };
		} catch (err) {
			console.error('Error creating journal entry:', err);
			return fail(500, {
				error: 'Failed to create journal entry',
				values: Object.fromEntries(formData)
			});
		}
	},

	post: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to post journal entries' });
		}

		const formData = await request.formData();
		const journalEntryId = parseInt(formData.get('id') as string);

		try {
			// Update journal entry status to POSTED
			await db.update(journalEntry)
				.set({
					status: 'POSTED',
					postedAt: new Date(),
					postedBy: locals.user.id,
					updatedAt: new Date()
				})
				.where(eq(journalEntry.id, journalEntryId));

			// TODO: Update account balances

			return { success: true };
		} catch (err) {
			console.error('Error posting journal entry:', err);
			return fail(500, { error: 'Failed to post journal entry' });
		}
	},

	reverse: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to reverse journal entries' });
		}

		const formData = await request.formData();
		const journalEntryId = parseInt(formData.get('id') as string);

		try {
			// Get the journal entry to reverse
			const entryToReverse = await db.query.journalEntry.findFirst({
				where: eq(journalEntry.id, journalEntryId),
				with: {
					lines: true,
					fiscalPeriod: true
				}
			});

			if (!entryToReverse) {
				return fail(404, { error: 'Journal entry not found' });
			}

			if (entryToReverse.status !== 'POSTED') {
				return fail(400, { error: 'Only posted journal entries can be reversed' });
			}

			// Create a new reversing entry
			const reversalNumber = `R-${entryToReverse.number}`;
			const reversalDate = new Date();

			// Update the original entry status
			await db.update(journalEntry)
				.set({
					status: 'REVERSED',
					updatedAt: new Date()
				})
				.where(eq(journalEntry.id, journalEntryId));

			// Create reversal entry
			const result = await db.insert(journalEntry).values({
				number: reversalNumber,
				date: reversalDate,
				description: `Rever
sal of ${entryToReverse.number}: ${entryToReverse.description}`,
				reference: entryToReverse.reference,
				fiscalPeriodId: entryToReverse.fiscalPeriodId,
				status: 'POSTED',
				totalDebit: entryToReverse.totalCredit,
				totalCredit: entryToReverse.totalDebit,
				postedAt: new Date(),
				postedBy: locals.user.id,
				createdBy: locals.user.id
			}).returning({ id: journalEntry.id });
			
			if (!result || result.length === 0) {
				throw new Error('Failed to create reversal entry');
			}
			
			const reversalEntryId = result[0].id;
			
			// Create reversal lines (with debits/credits swapped)
			for (const line of entryToReverse.lines) {
				await db.insert(journalEntryLine).values({
					journalEntryId: reversalEntryId,
					accountId: line.accountId,
					description: `Reversal: ${line.description || ''}`,
					debitAmount: line.creditAmount,
					creditAmount: line.debitAmount,
					lineNumber: line.lineNumber
				});
			}
			
			// TODO: Update account balances
			
			return { success: true, reversalEntryId };
		} catch (err) {
			console.error('Error reversing journal entry:', err);
			return fail(500, { error: 'Failed to reverse journal entry' });
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
			
			if (entryToDelete.status !== 'DRAFT') {
				return fail(400, { error: 'Only draft journal entries can be deleted' });
			}
			
			// Delete journal lines first
			await db.delete(journalEntryLine)
				.where(eq(journalEntryLine.journalEntryId, journalEntryId));
				
			// Then delete the journal entry
			await db.delete(journalEntry)
				.where(eq(journalEntry.id, journalEntryId));
			
			return { success: true };
		} catch (err) {
			console.error('Error deleting journal entry:', err);
			return fail(500, { error: 'Failed to delete journal entry' });
		}
	}
};