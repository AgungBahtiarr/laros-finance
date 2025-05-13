import { db } from '$lib/server/db';
import { chartOfAccount, journalEntry, journalEntryLine, fiscalPeriod, accountType } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { eq, and, desc, asc, gte, lte, sum, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Get filter parameters from URL
		const accountId = url.searchParams.get('accountId') || '';
		const accountTypeId = url.searchParams.get('accountTypeId') || '';
		const startDate = url.searchParams.get('startDate') || '';
		const endDate = url.searchParams.get('endDate') || '';
		const fiscalPeriodId = url.searchParams.get('fiscalPeriodId') || '';

		// Get all account types
		const accountTypes = await db.query.accountType.findMany({
			orderBy: [asc(accountType.name)]
		});

		// Get active accounts for filters
		const accounts = await db.query.chartOfAccount.findMany({
			where: eq(chartOfAccount.isActive, true),
			with: {
				accountType: true
			},
			orderBy: [asc(chartOfAccount.code)]
		});

		// Get fiscal periods for filter
		const fiscalPeriods = await db.query.fiscalPeriod.findMany({
			orderBy: [desc(fiscalPeriod.startDate)]
		});

		// Build filter conditions for transactions query
		const conditions = [];

		if (startDate) {
			conditions.push(gte(journalEntry.date, startDate));
		}

		if (endDate) {
			conditions.push(lte(journalEntry.date, endDate));
		}

		if (fiscalPeriodId) {
			conditions.push(eq(journalEntry.fiscalPeriodId, parseInt(fiscalPeriodId)));
		}

		// Add status condition to only include posted entries
		conditions.push(eq(journalEntry.status, 'POSTED'));

		// Account transactions - if an account is selected
		let accountTransactions = [];
		let accountDetails = null;

		if (accountId) {
			// Get account details
			accountDetails = await db.query.chartOfAccount.findFirst({
				where: eq(chartOfAccount.id, parseInt(accountId)),
				with: {
					accountType: true,
					parent: true
				}
			});

			if (!accountDetails) {
				throw error(404, 'Account not found');
			}

			// Get transactions for the account
			const lineConditions = [...conditions, eq(journalEntryLine.accountId, parseInt(accountId))];

			const lineSubquery = db
				.select({
					journalEntryId: journalEntryLine.journalEntryId
				})
				.from(journalEntryLine)
				.where(eq(journalEntryLine.accountId, parseInt(accountId)));

			accountTransactions = await db.query.journalEntry.findMany({
				where: and(...conditions, sql`${journalEntry.id} IN (${lineSubquery})`),
				with: {
					lines: {
						where: eq(journalEntryLine.accountId, parseInt(accountId)),
						with: {
							account: true
						}
					},
					fiscalPeriod: true
				},
				orderBy: [desc(journalEntry.date)]
			});

			// Calculate account balance by period
			const balancesByPeriod = await db
				.select({
					periodId: journalEntry.fiscalPeriodId,
					debitSum: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntryLine.debitAmount} > 0 THEN ${journalEntryLine.debitAmount} ELSE 0 END), 0)`,
					creditSum: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntryLine.creditAmount} > 0 THEN ${journalEntryLine.creditAmount} ELSE 0 END), 0)`
				})
				.from(journalEntryLine)
				.innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
				.where(
					and(
						eq(journalEntryLine.accountId, parseInt(accountId)),
						eq(journalEntry.status, 'POSTED')
					)
				)
				.groupBy(journalEntry.fiscalPeriodId);

			// Enhance with period details
			const periodsMap = new Map(fiscalPeriods.map(p => [p.id, p]));
			
			// Add period information to balance data
			const balancesWithPeriods = balancesByPeriod.map(balance => ({
				...balance,
				period: periodsMap.get(balance.periodId)
			}));

			// Add to account details
			accountDetails.balancesByPeriod = balancesWithPeriods;

			// Calculate total balance
			const totalDebit = balancesByPeriod.reduce((sum, period) => sum + Number(period.debitSum), 0);
			const totalCredit = balancesByPeriod.reduce((sum, period) => sum + Number(period.creditSum), 0);
			
			// Set the balance according to normal balance direction
			let netBalance = totalDebit - totalCredit;
			if (accountDetails.accountType.normalBalance === 'CREDIT') {
				netBalance = totalCredit - totalDebit;
			}
			
			accountDetails.netBalance = netBalance;
			accountDetails.totalDebit = totalDebit;
			accountDetails.totalCredit = totalCredit;
		}

		// For account type summaries, if an account type is selected
		let accountTypeSummary = null;

		if (accountTypeId) {
			const accountsOfType = accounts.filter(
				account => account.accountTypeId.toString() === accountTypeId
			);
			
			if (accountsOfType.length > 0) {
				const accountIds = accountsOfType.map(account => account.id);
				
				// Get summary data by account
				const summaryByAccount = await Promise.all(
					accountsOfType.map(async account => {
						const result = await db
							.select({
								debitSum: sql<number>`COALESCE(SUM(${journalEntryLine.debitAmount}), 0)`,
								creditSum: sql<number>`COALESCE(SUM(${journalEntryLine.creditAmount}), 0)`
							})
							.from(journalEntryLine)
							.innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
							.where(
								and(
									eq(journalEntryLine.accountId, account.id),
									eq(journalEntry.status, 'POSTED'),
									...conditions
								)
							);
							
						const { debitSum, creditSum } = result[0];
						const normalBalance = account.accountType.normalBalance;
						const balance = normalBalance === 'DEBIT' 
							? Number(debitSum) - Number(creditSum) 
							: Number(creditSum) - Number(debitSum);
							
						return {
							account,
							debitSum: Number(debitSum),
							creditSum: Number(creditSum),
							balance
						};
					})
				);
				
				// Calculate totals
				const totalDebit = summaryByAccount.reduce((sum, item) => sum + item.debitSum, 0);
				const totalCredit = summaryByAccount.reduce((sum, item) => sum + item.creditSum, 0);
				const totalBalance = summaryByAccount.reduce((sum, item) => sum + item.balance, 0);
				
				const selectedAccountType = accountTypes.find(type => type.id.toString() === accountTypeId);
				
				accountTypeSummary = {
					accountType: selectedAccountType,
					accounts: summaryByAccount,
					totalDebit,
					totalCredit,
					totalBalance
				};
			}
		}

		// Account balances by type (for dashboard charts)
		const balancesByType = await Promise.all(
			accountTypes.map(async type => {
				const accountsOfType = accounts.filter(
					account => account.accountTypeId === type.id
				);
				
				if (accountsOfType.length === 0) {
					return {
						accountType: type,
						totalBalance: 0,
						accountCount: 0
					};
				}
				
				const accountIds = accountsOfType.map(account => account.id);
				
				// Calculate total balances
				let totalBalance = 0;
				
				for (const account of accountsOfType) {
					const result = await db
						.select({
							debitSum: sql<number>`COALESCE(SUM(${journalEntryLine.debitAmount}), 0)`,
							creditSum: sql<number>`COALESCE(SUM(${journalEntryLine.creditAmount}), 0)`
						})
						.from(journalEntryLine)
						.innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
						.where(
							and(
								eq(journalEntryLine.accountId, account.id),
								eq(journalEntry.status, 'POSTED'),
								...conditions
							)
						);
						
					const { debitSum, creditSum } = result[0];
					
					// Add to total based on normal balance direction
					if (type.normalBalance === 'DEBIT') {
						totalBalance += Number(debitSum) - Number(creditSum);
					} else {
						totalBalance += Number(creditSum) - Number(debitSum);
					}
				}
				
				return {
					accountType: type,
					totalBalance,
					accountCount: accountsOfType.length
				};
			})
		);

		return {
			accounts,
			accountTypes,
			fiscalPeriods,
			accountDetails,
			accountTransactions,
			accountTypeSummary,
			balancesByType,
			filters: {
				accountId,
				accountTypeId,
				startDate,
				endDate,
				fiscalPeriodId
			}
		};
	} catch (err) {
		console.error('Error loading analyzer data:', err);
		throw error(500, 'Failed to load analyzer data');
	}
};