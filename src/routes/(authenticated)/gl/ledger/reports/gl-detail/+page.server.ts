import type { PageServerLoad } from './$types';
import { and, eq, gte, lte, inArray, sql, desc } from 'drizzle-orm';
import { chartOfAccount, accountBalance, fiscalPeriod, journalEntry, journalEntryLine } from '$lib/server/db/schema';

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

		// Calculate offset for pagination
		const offset = (page - 1) * PAGE_SIZE;

		// Get total count first
		const totalCountResult = await db
			.select({
				count: sql<number>`count(*)`.as('count')
			})
			.from(journalEntryLine)
			.leftJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
			.where(
				and(
					gte(journalEntry.date, startDate),
					lte(journalEntry.date, endDate),
					accountFilter || undefined,
					eq(journalEntry.status, 'POSTED')
				)
			);

		const totalCount = Number(totalCountResult[0]?.count || 0);

		if (totalCount === 0) {
			return {
				accounts,
				detailData: [],
				selectedAccounts,
				pagination: {
					currentPage: 1,
					totalPages: 0,
					totalItems: 0,
					pageSize: PAGE_SIZE
				}
			};
		}

		// Get opening balances for selected accounts
		const openingBalances = await db
			.select({
				accountId: accountBalance.accountId,
				openingBalance: accountBalance.openingBalance
			})
			.from(accountBalance)
			.where(
				and(
					eq(accountBalance.fiscalPeriodId, period.id),
					selectedAccounts.length > 0 
						? inArray(accountBalance.accountId, selectedAccounts)
						: undefined
				)
			);

		// Get journal entries with details
		const entries = await db
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
			.where(
				and(
					gte(journalEntry.date, startDate),
					lte(journalEntry.date, endDate),
					accountFilter || undefined,
					eq(journalEntry.status, 'POSTED')
				)
			)
			.orderBy(chartOfAccount.code, journalEntry.date, desc(journalEntry.number))
			.limit(PAGE_SIZE)
			.offset(offset);

		// Transform and calculate running balances
		const detailData = entries.map((entry) => {
			const openingBalance = openingBalances.find(bal => bal.accountId === entry.accountId)?.openingBalance || 0;
			
			return {
				accountId: entry.accountId,
				accountCode: entry.account.code,
				accountName: entry.account.name,
				date: entry.date,
				journalNumber: entry.journalNumber,
				reffNumber: entry.reffNumber || '',
				note: entry.note || '',
				detailNote: entry.detailNote || '',
				openingBalance: Number(openingBalance),
				debit: Number(entry.debitAmount) || 0,
				credit: Number(entry.creditAmount) || 0,
				balance: Number(openingBalance) + (Number(entry.debitAmount) || 0) - (Number(entry.creditAmount) || 0)
			};
		});

		return {
			accounts,
			detailData,
			selectedAccounts,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalCount / PAGE_SIZE),
				totalItems: totalCount,
				pageSize: PAGE_SIZE
			}
		};
	} catch (error) {
		console.error('Error in GL Detail load:', error);
		throw error;
	}
}; 