import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { getRevenueExpenseAccounts } from '../../../routes/(authenticated)/gl/ledger/reports/utils.server';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL environment variable is not set');
	process.exit(1);
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool, { schema });

async function testProfitLossData() {
	try {
		console.log('=== TESTING PROFIT & LOSS REPORT ===\n');

		// Test current month
		const currentDate = new Date();
		const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
			.toISOString()
			.split('T')[0];
		const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
			.toISOString()
			.split('T')[0];

		console.log(`Testing date range: ${startDate} to ${endDate}`);

		// Mock event object for testing
		const mockEvent = {
			locals: { db }
		};

		const filters = {
			dateRange: { start: startDate, end: endDate },
			showPercentages: false
		};

		console.log('\n1. FETCHING ACCOUNT BALANCES...');
		const { revenues, expenses } = await getRevenueExpenseAccounts(mockEvent, filters);

		console.log('\n2. REVENUE ACCOUNTS:');
		console.log(`Found ${revenues.length} revenue accounts:`);
		revenues.forEach((account) => {
			console.log(`  - ${account.code}: ${account.name}`);
			console.log(`    Group: ${account.groupName || account.groupCode}`);
			console.log(
				`    Balance: ${account.balance} (Debit: ${account.debit}, Credit: ${account.credit})`
			);
			console.log('');
		});

		console.log('\n3. EXPENSE ACCOUNTS:');
		console.log(`Found ${expenses.length} expense accounts:`);
		expenses.forEach((account) => {
			console.log(`  - ${account.code}: ${account.name}`);
			console.log(`    Group: ${account.groupName || account.groupCode}`);
			console.log(
				`    Balance: ${account.balance} (Debit: ${account.debit}, Credit: ${account.credit})`
			);
			console.log('');
		});

		// Calculate totals
		const revenueTotals = revenues.reduce(
			(totals, acc) => ({
				debit: totals.debit + (acc.debit || 0),
				credit: totals.credit + (acc.credit || 0),
				balance: totals.balance + (acc.balance || 0)
			}),
			{ debit: 0, credit: 0, balance: 0 }
		);

		const expenseTotals = expenses.reduce(
			(totals, acc) => ({
				debit: totals.debit + (acc.debit || 0),
				credit: totals.credit + (acc.credit || 0),
				balance: totals.balance + (acc.balance || 0)
			}),
			{ debit: 0, credit: 0, balance: 0 }
		);

		const netIncome = revenueTotals.balance - expenseTotals.balance;

		console.log('\n4. SUMMARY:');
		console.log(`Total Revenue: ${revenueTotals.balance}`);
		console.log(`Total Expenses: ${expenseTotals.balance}`);
		console.log(`Net Income: ${netIncome}`);

		// Check for posted journal entries
		console.log('\n5. CHECKING JOURNAL ENTRIES...');
		const journalEntries = await db.query.journalEntry.findMany({
			where: (journalEntry, { and, gte, lte, eq }) =>
				and(
					gte(journalEntry.date, startDate),
					lte(journalEntry.date, endDate),
					eq(journalEntry.status, 'POSTED')
				),
			with: {
				lines: {
					with: {
						account: {
							with: {
								accountGroup: true
							}
						}
					}
				}
			},
			limit: 10
		});

		console.log(`Found ${journalEntries.length} posted journal entries in date range:`);
		journalEntries.forEach((entry) => {
			console.log(`  - ${entry.number}: ${entry.description} (${entry.date})`);
			console.log(`    Total Debit: ${entry.totalDebit}, Total Credit: ${entry.totalCredit}`);
			entry.lines.forEach((line) => {
				console.log(`    Line: ${line.account?.code} - ${line.account?.name}`);
				console.log(`          Debit: ${line.debitAmount}, Credit: ${line.creditAmount}`);
			});
			console.log('');
		});

		console.log('\n=== TEST COMPLETED ===');
	} catch (error) {
		console.error('Error testing profit & loss data:', error);
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		}
	} finally {
		await pool.end();
	}
}

testProfitLossData();
