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
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';

// Helper function to generate next journal number based on date
async function generateNextJournalNumber(inputDate: string) {
	const date = new Date(inputDate);
	const year = date.getFullYear().toString().slice(-2); // dari input date
	const month = (date.getMonth() + 1).toString().padStart(2, '0'); // dari input date

	const prefix = `JV${year}${month}`;

	// Cari journal terakhir HANYA di bulan yang sama dengan input date
	const lastEntry = await db.query.journalEntry.findFirst({
		where: sql`${journalEntry.number} LIKE ${prefix + '%'}`,
		orderBy: [desc(journalEntry.number)]
	});

	if (lastEntry) {
		// Ada journal sebelumnya di bulan ini, lanjutkan urutannya
		const lastSequence = parseInt(lastEntry.number.substring(6) || '0');
		const newSequence = (lastSequence + 1).toString().padStart(2, '0');
		return prefix + newSequence;
	} else {
		// Belum ada journal di bulan ini, mulai dari 01
		return `${prefix}01`;
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
			}
		};
	} catch (err) {
		console.error('Error loading journal entries:', err);
		throw error(500, 'Failed to load journal entries');
	}
};

export const actions: Actions = {
	// Action untuk generate journal number berdasarkan tanggal
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

			if (!formData.get('isbhp')) {
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
				return { success: true, journalEntryId };
			} else {
				const komBagiHasil = parseInt(formData.get('jumlahKomitmenBagiHasil') as string);
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
						debitAmount: pphDuaSatu,
						creditAmount: 0,
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

				return { success: true, journalEntryId2 };
			}
		} catch (err) {
			console.error('Error creating journal entry:', err);
			return fail(500, {
				error: 'Failed to create journal entry',
				values: Object.fromEntries(formData)
			});
		}
	},

	// create2: async ({ request, locals }) => {
	// 	// --- Start: Boilerplate User & Form Data Handling ---
	// 	if (!locals.user) {
	// 		return fail(401, { error: 'You must be logged in to create journal entries' });
	// 	}

	// 	const formData = await request.formData();

	// 	const date = formData.get('date') as string;
	// 	const description = formData.get('description') as string;
	// 	const reference = formData.get('reference') as string;
	// 	const fiscalPeriodId = parseInt(formData.get('fiscalPeriodId') as string);

	// 	const lineCount = parseInt(formData.get('lineCount') as string);
	// 	const initialJournalLines = [];
	// 	let totalDebit = 0;
	// 	let totalCredit = 0;

	// 	for (let i = 0; i < lineCount; i++) {
	// 		const accountIdValue = formData.get(`lines[${i}].accountId`);
	// 		if (!accountIdValue) continue;

	// 		const accountId = parseInt(accountIdValue as string);
	// 		const lineDescription = formData.get(`lines[${i}].description`) as string;
	// 		const debitAmount = parseFloat((formData.get(`lines[${i}].debitAmount`) as string) || '0');
	// 		const creditAmount = parseFloat((formData.get(`lines[${i}].creditAmount`) as string) || '0');

	// 		if (accountId && (debitAmount > 0 || creditAmount > 0)) {
	// 			initialJournalLines.push({
	// 				accountId,
	// 				description: lineDescription,
	// 				debitAmount,
	// 				creditAmount,
	// 				lineNumber: i + 1
	// 			});
	// 			totalDebit += debitAmount;
	// 			totalCredit += creditAmount;
	// 		}
	// 	}

	// 	if (initialJournalLines.length < 2) {
	// 		return fail(400, {
	// 			error: 'Journal entry must have at least two lines',
	// 			values: Object.fromEntries(formData)
	// 		});
	// 	}

	// 	if (Math.abs(totalDebit - totalCredit) > 0.01) {
	// 		return fail(400, {
	// 			error: 'Total debits must equal total credits',
	// 			values: Object.fromEntries(formData)
	// 		});
	// 	}
	// 	// --- End: Boilerplate User & Form Data Handling ---

	// 	// Gunakan transaksi database untuk memastikan integritas data.
	// 	// Jika salah satu jurnal gagal dibuat, semua akan dibatalkan.
	// 	try {
	// 		const result = await db.transaction(async (tx) => {
	// 			// === JURNAL 1: PENCATATAN PENDAPATAN (Original Logic) ===
	// 			const journal1_Number = await generateNextJournalNumber(date, tx);

	// 			// Cek duplikasi nomor jurnal
	// 			const existingEntry1 = await tx.query.journalEntry.findFirst({
	// 				where: eq(journalEntry.number, journal1_Number)
	// 			});
	// 			if (existingEntry1) {
	// 				throw new Error(`Journal number ${journal1_Number} already exists.`);
	// 			}

	// 			const journal1_Result = await tx
	// 				.insert(journalEntry)
	// 				.values({
	// 					number: journal1_Number,
	// 					date: new Date(date),
	// 					description,
	// 					reference,
	// 					fiscalPeriodId,
	// 					status: 'POSTED',
	// 					totalDebit,
	// 					totalCredit,
	// 					createdBy: locals.user.id,
	// 					postedAt: new Date(),
	// 					postedBy: locals.user.id
	// 				})
	// 				.returning({ id: journalEntry.id });

	// 			const journalEntryId1 = journal1_Result[0].id;

	// 			for (const line of initialJournalLines) {
	// 				await tx.insert(journalEntryLine).values({
	// 					journalEntryId: journalEntryId1,
	// 					...line
	// 				});
	// 			}

	// 			// === LOGIKA BARU: JURNAL 2 (BEBAN & KOMITMEN BAGI HASIL) ===
	// 			// Cek apakah ada transaksi pendapatan reseller (accountId: 115)
	// 			const isResellerTransaction = initialJournalLines.some(
	// 				(line) => line.accountId === 115 && line.creditAmount > 0
	// 			);

	// 			if (isResellerTransaction) {
	// 				// --- START: KONFIGURASI UNTUK PERHITUNGAN & AKUN ---
	// 				// Anda bisa memindahkan ini ke tabel konfigurasi di database untuk fleksibilitas
	// 				const PPN_RATE = 0.11; // 11% PPN
	// 				const ROLL_UP_FEE_RATE = 0.01; // 1%
	// 				const PAYMENT_GATEWAY_FEE_RATE = 0.015; // 1.5%
	// 				const OTHER_FEE_RATE = 0.005; // 0.5%
	// 				const ISP_PROFIT_SHARE_RATE = 0.7; // 70%

	// 				// Tentukan ID Akun yang akan digunakan untuk jurnal kedua.
	// 				// PASTIKAN ID INI SUDAH ADA DI TABEL `account` ANDA!
	// 				const BEBAN_POKOK_PENDAPATAN_ACCOUNT_ID = 511; // Contoh: Akun untuk HPP/Beban Pokok
	// 				const LABA_DITAHAN_RESELLER_ACCOUNT_ID = 321; // Contoh: Akun Laba Ditahan khusus Reseller
	// 				const KOMITMEN_BAGI_HASIL_ISP_ACCOUNT_ID = 225; // Contoh: Akun Hutang/Kewajiban Bagi Hasil
	// 				// --- END: KONFIGURASI ---

	// 				// `totalCredit` dari jurnal pertama adalah `Pendapatan` untuk perhitungan ini
	// 				const pendapatan = totalCredit;

	// 				// 1. Hitung semua biaya berdasarkan pendapatan
	// 				const biayaRollUp = pendapatan * ROLL_UP_FEE_RATE;
	// 				const biayaPaymentGateway = pendapatan * PAYMENT_GATEWAY_FEE_RATE;
	// 				const biayaLainLain = pendapatan * OTHER_FEE_RATE;
	// 				const totalBiaya = biayaRollUp + biayaPaymentGateway + biayaLainLain;

	// 				// 2. Hitung Laba Kotor
	// 				const labaKotor = pendapatan - totalBiaya;

	// 				// 3. Hitung Komitmen Bagi Hasil & Laba Ditahan (Jawaban pertanyaan Anda)
	// 				// Nilai "Komitmen Bagi Hasil Untuk ISP" didapat dari persentase Laba Kotor.
	// 				const komitmenBagiHasilISP = labaKotor * ISP_PROFIT_SHARE_RATE;
	// 				const labaDitahanReseller = labaKotor - komitmenBagiHasilISP;

	// 				// 4. Siapkan Jurnal Kedua
	// 				const journal2_Description = `Beban & Komitmen Bagi Hasil untuk ${description}`;
	// 				const journal2_Number = await generateNextJournalNumber(date, tx);

	// 				const journal2_Lines = [
	// 					{
	// 						accountId: BEBAN_POKOK_PENDAPATAN_ACCOUNT_ID,
	// 						description: 'Beban Pokok Pendapatan Reseller',
	// 						debitAmount: totalBiaya,
	// 						creditAmount: 0,
	// 						lineNumber: 1
	// 					},
	// 					{
	// 						accountId: LABA_DITAHAN_RESELLER_ACCOUNT_ID,
	// 						description: 'Laba Ditahan dari Pendapatan Reseller',
	// 						debitAmount: labaDitahanReseller,
	// 						creditAmount: 0,
	// 						lineNumber: 2
	// 					},
	// 					{
	// 						accountId: KOMITMEN_BAGI_HASIL_ISP_ACCOUNT_ID,
	// 						description: 'Komitmen Bagi Hasil untuk ISP',
	// 						debitAmount: 0,
	// 						creditAmount: komitmenBagiHasilISP,
	// 						lineNumber: 3
	// 					}
	// 				];

	// 				const journal2_TotalDebit = totalBiaya + labaDitahanReseller;
	// 				const journal2_TotalCredit = komitmenBagiHasilISP;

	// 				// Debet dan Kredit harus seimbang.
	// 				// Laba Kotor (Debit) = Komitmen (Credit) + Laba Ditahan (Debit Sisa) -> Ini tidak balance
	// 				// Rumus jurnalnya adalah:
	// 				// Dr. Beban Pokok Pendapatan ..... [Total Biaya]
	// 				// Dr. Laba Ditahan Reseller ...... [Laba Ditahan]
	// 				// Cr. .................... Komitmen Bagi Hasil ... [Komitmen Bagi Hasil]
	// 				//
	// 				// Ini tidak seimbang. Mari kita perbaiki berdasarkan Excel.
	// 				// Jurnal kedua harusnya:
	// 				// Dr. Beban Pokok Pendapatan .............. [Total Biaya]
	// 				// Dr. Komitmen Bagi Hasil (Aset) .......... [Komitmen Bagi Hasil]
	// 				// Cr. ................. Hutang Beban ....................... [Total Biaya]
	// 				// Cr. ................. Hutang Komitmen ISP ................ [Komitmen Bagi Hasil]
	// 				// Sepertinya jurnal di sheet 2 Anda perlu direview.
	// 				//
	// 				// Asumsi jurnal yang logis adalah mencatat BEBAN dan HUTANG BAGI HASIL.
	// 				// Dr. Beban Pokok Pendapatan [Total Biaya]
	// 				// Dr. Beban Bagi Hasil ISP   [Komitmen Bagi Hasil]
	// 				//    Cr. Hutang Usaha/Kas      [Total Biaya]  <-- Ini tergantung metode
	// 				//    Cr. Hutang Bagi Hasil ISP [Komitmen Bagi Hasil]
	// 				//
	// 				// Mari kita ikuti logika paling sederhana: Jurnal pengakuan beban dan kewajiban dari laba kotor.
	// 				// Dr. Beban Pokok Pendapatan ............ [Total Biaya]
	// 				// Dr. Ikhtisar Laba Rugi ................ [Laba Kotor]
	// 				//    Cr. Pendapatan ........................ [Pendapatan]
	// 				// Dr. Beban Bagi Hasil ................... [Komitmen Bagi Hasil]
	// 				//    Cr. Hutang Bagi Hasil ................. [Komitmen Bagi Hasil]
	// 				//
	// 				// Ok, kita akan buat jurnal paling sederhana untuk mencatat Beban dan Kewajiban Bagi Hasil
	// 				// Dr. Beban Pokok Pendapatan ............. [Total Biaya]
	// 				// Dr. Beban Bagi Hasil ................... [Komitmen Bagi Hasil ISP]
	// 				// Cr. Hutang Pihak Ketiga (Biaya) ......... [Total Biaya]
	// 				// Cr. Hutang Bagi Hasil ISP .............. [Komitmen Bagi Hasil ISP]
	// 				// Ini terlalu kompleks dan butuh banyak akun.
	// 				//
	// 				// KITA IKUTI ASUMSI DARI EXCEL SHEET 2:
	// 				// Debit: Beban Pokok Pendapatan (Total Biaya)
	// 				// Debit: Laba Ditahan (Laba Ditahan)
	// 				// Credit: Komitmen Bagi Hasil Untuk ISP (Komitmen)
	// 				// Total Debit = Total Biaya + Laba Ditahan
	// 				// Total Credit = Komitmen Bagi Hasil
	// 				// Ini TIDAK AKAN PERNAH BALANCE. Total Debit != Total Credit.
	// 				//
	// 				// Mari kita REVISI jurnal kedua agar menjadi logis dan balance:
	// 				// Jurnal ini untuk memecah Laba Kotor menjadi Komitmen dan Laba Ditahan.
	// 				// Dr. Ikhtisar Laba Rugi ................... [Laba Kotor]
	// 				//    Cr. Komitmen Bagi Hasil Untuk ISP ....... [Komitmen Bagi Hasil ISP]
	// 				//    Cr. Laba Ditahan Reseller ............... [Laba Ditahan Reseller]

	// 				const IKHTISAR_LABA_RUGI_ACCOUNT_ID = 399; // Contoh Akun Ikhtisar L/R

	// 				const revisedJournal2_Lines = [
	// 					{
	// 						accountId: IKHTISAR_LABA_RUGI_ACCOUNT_ID,
	// 						description: 'Alokasi Laba Kotor Reseller',
	// 						debitAmount: labaKotor, // Total Laba Kotor di sisi DEBIT
	// 						creditAmount: 0,
	// 						lineNumber: 1
	// 					},
	// 					{
	// 						accountId: KOMITMEN_BAGI_HASIL_ISP_ACCOUNT_ID,
	// 						description: 'Komitmen Bagi Hasil untuk ISP',
	// 						debitAmount: 0,
	// 						creditAmount: komitmenBagiHasilISP, // Dipecah di sisi KREDIT
	// 						lineNumber: 2
	// 					},
	// 					{
	// 						accountId: LABA_DITAHAN_RESELLER_ACCOUNT_ID,
	// 						description: 'Laba Ditahan dari Pendapatan Reseller',
	// 						debitAmount: 0,
	// 						creditAmount: labaDitahanReseller, // Dipecah di sisi KREDIT
	// 						lineNumber: 3
	// 					}
	// 				];

	// 				const journal2_Result = await tx
	// 					.insert(journalEntry)
	// 					.values({
	// 						number: journal2_Number,
	// 						date: new Date(date),
	// 						description: journal2_Description,
	// 						reference,
	// 						fiscalPeriodId,
	// 						status: 'POSTED',
	// 						totalDebit: labaKotor,
	// 						totalCredit: komitmenBagiHasilISP + labaDitahanReseller, // Ini akan sama dengan labaKotor
	// 						createdBy: locals.user.id,
	// 						postedAt: new Date(),
	// 						postedBy: locals.user.id
	// 					})
	// 					.returning({ id: journalEntry.id });

	// 				const journalEntryId2 = journal2_Result[0].id;

	// 				for (const line of revisedJournal2_Lines) {
	// 					await tx.insert(journalEntryLine).values({
	// 						journalEntryId: journalEntryId2,
	// 						...line
	// 					});
	// 				}
	// 			}

	// 			// Mengembalikan ID dari jurnal pertama yang dibuat
	// 			return { success: true, journalEntryId: journalEntryId1 };
	// 		});

	// 		return result;
	// 	} catch (err) {
	// 		console.error('Error creating journal entry transaction:', err);
	// 		// Rollback akan terjadi secara otomatis karena error
	// 		return fail(500, {
	// 			error: err.message || 'Failed to create journal entry due to a transaction error.',
	// 			values: Object.fromEntries(formData)
	// 		});
	// 	}
	// },

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
