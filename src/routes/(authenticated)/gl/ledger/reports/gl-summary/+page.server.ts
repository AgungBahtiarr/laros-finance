import type { PageServerLoad } from './$types';
import { and, eq, gte, lte, inArray, sql, lt } from 'drizzle-orm';
import { chartOfAccount, journalEntry, journalEntryLine } from '$lib/server/db/schema';

export const load: PageServerLoad = async (event) => {
	try {
		const { db } = event.locals;
		const searchParams = event.url.searchParams;
		const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
		const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
		const selectedAccounts = searchParams.get('accounts')?.split(',').map(Number) || [];
		const journalType = searchParams.get('journalType') || 'all';

		const startDateObj = new Date(startDate);
		const year = startDateObj.getFullYear();
		const startOfYear = new Date(year, 0, 1).toISOString().split('T')[0];

		// Get active accounts for the filter
		const accounts = await db
			.select({
				id: chartOfAccount.id,
				code: chartOfAccount.code,
				name: chartOfAccount.name
			})
			.from(chartOfAccount)
			.where(eq(chartOfAccount.isActive, true))
			.orderBy(chartOfAccount.code);

		// Build account filter
		const accountFilter =
			selectedAccounts.length > 0
				? inArray(journalEntryLine.accountId, selectedAccounts)
				: undefined;

		// Build journal type filter
		let journalTypeFilter = undefined;
		let netJournalNumbers: string[] = [];

		if (journalType === 'commitment') {
			journalTypeFilter = sql`${journalEntry.number} NOT LIKE 'b%'`;
		} else if (journalType === 'breakdown') {
			journalTypeFilter = sql`${journalEntry.number} LIKE 'b%'`;
		} else if (journalType === 'net') {
			// Net Transactions: Avoid double counting
			const allJournals = await db
				.select({ number: journalEntry.number })
				.from(journalEntry)
				.where(
					and(
						gte(journalEntry.date, startOfYear),
						lte(journalEntry.date, endDate),
						eq(journalEntry.status, 'POSTED')
					)
				);

			const journalsWithoutDoubleCount: string[] = [];
			for (const journal of allJournals) {
				const number = journal.number;
				if (number.startsWith('b')) {
					journalsWithoutDoubleCount.push(number);
				} else {
					const hasBreakdownPair = allJournals.some((j) => j.number === 'b' + number);
					if (!hasBreakdownPair) {
						journalsWithoutDoubleCount.push(number);
					}
				}
			}

			netJournalNumbers = journalsWithoutDoubleCount;
			if (netJournalNumbers.length > 0) {
				journalTypeFilter = inArray(journalEntry.number, netJournalNumbers);
			} else {
				journalTypeFilter = sql`1 = 0`;
			}
		}

		// Get unique accounts with transactions
		const accountsWithTransactions = await db
			.select({
				accountId: journalEntryLine.accountId
			})
			.from(journalEntryLine)
			.leftJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
			.where(
				and(
					gte(journalEntry.date, startOfYear),
					lte(journalEntry.date, endDate),
					eq(journalEntry.status, 'POSTED'),
					accountFilter || undefined,
					journalTypeFilter || undefined
				)
			)
			.groupBy(journalEntryLine.accountId)
			.orderBy(journalEntryLine.accountId);

		if (accountsWithTransactions.length === 0) {
			return {
				accounts,
				summaryData: [],
				totals: {
					beginningBalance: 0,
					changeDebit: 0,
					changeCredit: 0,
					netChange: 0,
					endingBalance: 0
				},
				selectedAccounts,
				filters: {
					startDate,
					endDate,
					journalType
				}
			};
		}

		// Get account details and balances
		const balances = await Promise.all(
			accountsWithTransactions.map(async ({ accountId }) => {
				// Get account details
				const accountDetails = await db
					.select({
						id: chartOfAccount.id,
						code: chartOfAccount.code,
						name: chartOfAccount.name
					})
					.from(chartOfAccount)
					.where(eq(chartOfAccount.id, accountId))
					.limit(1);

				if (!accountDetails[0]) {
					throw new Error(`Account not found: ${accountId}`);
				}

				// Get balances in a single query
				const balancesResult = await db
					.select({
						beginningBalance:
							sql<number>`COALESCE(SUM(CASE WHEN ${journalEntry.date} < ${startDate} THEN COALESCE(${journalEntryLine.debitAmount}, 0) - COALESCE(${journalEntryLine.creditAmount}, 0) ELSE 0 END), 0)`.as(
								'beginning_balance'
							),
						changeDebit:
							sql<number>`COALESCE(SUM(CASE WHEN ${journalEntry.date} >= ${startDate} THEN COALESCE(${journalEntryLine.debitAmount}, 0) ELSE 0 END), 0)`.as(
								'change_debit'
							),
						changeCredit:
							sql<number>`COALESCE(SUM(CASE WHEN ${journalEntry.date} >= ${startDate} THEN COALESCE(${journalEntryLine.creditAmount}, 0) ELSE 0 END), 0)`.as(
								'change_credit'
							)
					})
					.from(journalEntryLine)
					.leftJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
					.where(
						and(
							eq(journalEntryLine.accountId, accountId),
							gte(journalEntry.date, startOfYear),
							lte(journalEntry.date, endDate),
							eq(journalEntry.status, 'POSTED'),
							journalTypeFilter || undefined
						)
					);

				const beginningBalance = Number(balancesResult[0]?.beginningBalance || 0);
				const changeDebit = Number(balancesResult[0]?.changeDebit || 0);
				const changeCredit = Number(balancesResult[0]?.changeCredit || 0);
				const netChange = changeDebit - changeCredit;
				const endingBalance = beginningBalance + netChange;

				return {
					accountId,
					accountCode: accountDetails[0].code,
					accountName: accountDetails[0].name,
					beginningBalance,
					changeDebit,
					changeCredit,
					netChange,
					endingBalance
				};
			})
		);

		// Calculate totals
		const totals = balances.reduce(
			(acc, row) => ({
				beginningBalance: acc.beginningBalance + row.beginningBalance,
				changeDebit: acc.changeDebit + row.changeDebit,
				changeCredit: acc.changeCredit + row.changeCredit,
				netChange: acc.netChange + row.netChange,
				endingBalance: acc.endingBalance + row.endingBalance
			}),
			{
				beginningBalance: 0,
				changeDebit: 0,
				changeCredit: 0,
				netChange: 0,
				endingBalance: 0
			}
		);

		return {
			accounts,
			summaryData: balances,
			totals,
			selectedAccounts,
			filters: {
				startDate,
				endDate,
				journalType
			}
		};
	} catch (error) {
		console.error('Error in GL Summary load:', error);
		throw error;
	}
};