import type { PageServerLoad } from './$types';
import { and, eq, gte, lte, inArray, sql, lt } from 'drizzle-orm';
import { chartOfAccount, fiscalPeriod, journalEntry, journalEntryLine } from '$lib/server/db/schema';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async (event) => {
	try {
		const { db } = event.locals;
		const searchParams = event.url.searchParams;
		const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
		const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
		const selectedAccounts = searchParams.get('accounts')?.split(',').map(Number) || [];
		const page = Number(searchParams.get('page')) || 1;

		// Get the fiscal period first to fail fast if not found
		const period = await db.query.fiscalPeriod.findFirst({
			where: and(
				lte(fiscalPeriod.startDate, startDate),
				gte(fiscalPeriod.endDate, endDate)
			)
		});

		if (!period) {
			throw new Error('No fiscal period found for the specified date range');
		}

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
		const accountFilter = selectedAccounts.length > 0 
			? inArray(journalEntryLine.accountId, selectedAccounts)
			: undefined;

		// Get total count of unique accounts with transactions
		const totalCountResult = await db
			.select({
				count: sql<number>`COUNT(DISTINCT ${journalEntryLine.accountId})`.as('count')
			})
			.from(journalEntryLine)
			.leftJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
			.where(
				and(
					lte(journalEntry.date, endDate),
					eq(journalEntry.status, 'POSTED'),
					accountFilter || undefined
				)
			);

		const totalCount = Number(totalCountResult[0]?.count || 0);

		if (totalCount === 0) {
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
				pagination: {
					currentPage: 1,
					totalPages: 0,
					totalItems: 0,
					pageSize: PAGE_SIZE
				}
			};
		}

		// Calculate offset for pagination
		const offset = (page - 1) * PAGE_SIZE;

		// Get unique accounts with transactions for the current page
		const accountsWithTransactions = await db
			.select({
				accountId: journalEntryLine.accountId
			})
			.from(journalEntryLine)
			.leftJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
			.where(
				and(
					lte(journalEntry.date, endDate),
					eq(journalEntry.status, 'POSTED'),
					accountFilter || undefined
				)
			)
			.groupBy(journalEntryLine.accountId)
			.orderBy(journalEntryLine.accountId)
			.limit(PAGE_SIZE)
			.offset(offset);

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

				// Get beginning balance
				const beginningBalanceResult = await db
					.select({
						balance: sql<string>`COALESCE(SUM(COALESCE(${journalEntryLine.debitAmount}, 0) - COALESCE(${journalEntryLine.creditAmount}, 0)), 0)`.as('balance')
					})
					.from(journalEntryLine)
					.leftJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
					.where(
						and(
							eq(journalEntryLine.accountId, accountId),
							lt(journalEntry.date, startDate),
							eq(journalEntry.status, 'POSTED')
						)
					);

				// Get period movements
				const movementsResult = await db
					.select({
						debit: sql<string>`COALESCE(SUM(COALESCE(${journalEntryLine.debitAmount}, 0)), 0)`.as('debit'),
						credit: sql<string>`COALESCE(SUM(COALESCE(${journalEntryLine.creditAmount}, 0)), 0)`.as('credit')
					})
					.from(journalEntryLine)
					.leftJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
					.where(
						and(
							eq(journalEntryLine.accountId, accountId),
							gte(journalEntry.date, startDate),
							lte(journalEntry.date, endDate),
							eq(journalEntry.status, 'POSTED')
						)
					);

				const beginningBalance = Number(beginningBalanceResult[0]?.balance || 0);
				const changeDebit = Number(movementsResult[0]?.debit || 0);
				const changeCredit = Number(movementsResult[0]?.credit || 0);
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
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalCount / PAGE_SIZE),
				totalItems: totalCount,
				pageSize: PAGE_SIZE
			}
		};
	} catch (error) {
		console.error('Error in GL Summary load:', error);
		throw error;
	}
}; 