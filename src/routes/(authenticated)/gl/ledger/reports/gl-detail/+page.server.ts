import type { PageServerLoad } from './$types';
import { and, eq, gte, lte, sql, desc } from 'drizzle-orm';
import { chartOfAccount, journalEntry, journalEntryLine } from '$lib/server/db/schema';

export const load: PageServerLoad = async (event) => {
	try {
		const { db } = event.locals;
		const searchParams = event.url.searchParams;
		const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
		const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
		const accountId = searchParams.get('accountId');
		const journalType = searchParams.get('journalType') || 'all';

		const coa = await db
			.select({
				id: chartOfAccount.id,
				name: chartOfAccount.name,
				code: chartOfAccount.code
			})
			.from(chartOfAccount)
			.orderBy(chartOfAccount.code);

		const whereClauses = [lte(journalEntry.date, endDate), eq(journalEntry.status, 'POSTED')];

		if (accountId) {
			whereClauses.push(eq(journalEntryLine.accountId, accountId));
		}

		// Add journal type filter
		if (journalType === 'commitment') {
			whereClauses.push(sql`${journalEntry.number} NOT LIKE 'b%'`);
		} else if (journalType === 'breakdown') {
			whereClauses.push(sql`${journalEntry.number} LIKE 'b%'`);
		}

		// Get all transactions for all accounts up to the end date
		const allTransactions = await db
			.select({
				accountId: journalEntryLine.accountId,
				account: {
					code: chartOfAccount.code,
					name: chartOfAccount.name
				},
				date: journalEntry.date,
				journalNumber: journalEntry.number,
				reffNumber: journalEntry.reference,
				note: journalEntry.description,
				detailNote: journalEntryLine.description,
				debitAmount: journalEntryLine.debitAmount,
				creditAmount: journalEntryLine.creditAmount
			})
			.from(journalEntryLine)
			.leftJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
			.leftJoin(chartOfAccount, eq(journalEntryLine.accountId, chartOfAccount.id))
			.where(and(...whereClauses))
			.orderBy(chartOfAccount.code, journalEntry.date, journalEntry.number);

		// Process data in TypeScript
		const reportDataMap = new Map();

		for (const trx of allTransactions) {
			if (!reportDataMap.has(trx.accountId)) {
				reportDataMap.set(trx.accountId, {
					accountId: trx.accountId,
					accountCode: trx.account.code,
					accountName: trx.account.name,
					openingBalance: 0,
					transactions: [],
					totalDebit: 0,
					totalCredit: 0,
					endingBalance: 0
				});
			}

			const accountData = reportDataMap.get(trx.accountId);
			const debit = Number(trx.debitAmount) || 0;
			const credit = Number(trx.creditAmount) || 0;

			if (new Date(trx.date) < new Date(startDate)) {
				accountData.openingBalance += debit - credit;
			} else {
				accountData.transactions.push({
					date: trx.date,
					journalNumber: trx.journalNumber,
					reffNumber: trx.reffNumber || '',
					note: trx.note || '',
					detailNote: trx.detailNote || '',
					debit: debit,
					credit: credit,
					balance: 0 // Placeholder, will be calculated next
				});
				accountData.totalDebit += debit;
				accountData.totalCredit += credit;
			}
		}

		// Calculate running balances and ending balances
		for (const accountData of reportDataMap.values()) {
			let runningBalance = accountData.openingBalance;
			accountData.endingBalance = accountData.openingBalance;

			for (const trx of accountData.transactions) {
				runningBalance += trx.debit - trx.credit;
				trx.balance = runningBalance;
			}

			accountData.endingBalance += accountData.totalDebit - accountData.totalCredit;
		}

		const finalReportData = Array.from(reportDataMap.values()).filter(
			(acc) => acc.openingBalance !== 0 || acc.transactions.length > 0
		);

		return {
			reportData: finalReportData,
			dateRange: { start: startDate, end: endDate },
			accounts: coa,
			selectedAccountId: accountId,
			filters: {
				startDate,
				endDate,
				journalType
			}
		};
	} catch (error) {
		console.error('Error in GL Detail load:', error);
		throw error;
	}
};
