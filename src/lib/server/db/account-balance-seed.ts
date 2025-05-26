import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL environment variable is not set');
	process.exit(1);
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool, { schema });

async function main() {
	try {
		console.log('Seeding account balances...');

		// Get current fiscal period
		const currentYear = new Date().getFullYear();
		const currentMonth = new Date().getMonth() + 1;
		
		const fiscalPeriod = await db.query.fiscalPeriod.findFirst({
			where: and(
				eq(schema.fiscalPeriod.startDate, `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
			)
		});

		if (!fiscalPeriod) {
			console.log('Available fiscal periods:');
			const allPeriods = await db.query.fiscalPeriod.findMany();
			allPeriods.forEach(p => console.log(`  - ${p.name}: ${p.startDate} to ${p.endDate}`));
			throw new Error('No fiscal period found for current month. Please run fiscal period seed first.');
		}

		console.log(`Using fiscal period: ${fiscalPeriod.name} (${fiscalPeriod.startDate} to ${fiscalPeriod.endDate})`);

		// Get accounts for revenue and expense
		const accounts = await db.query.chartOfAccount.findMany({
			with: {
				accountGroup: {
					with: {
						accountType: true
					}
				}
			}
		});

		const revenueAccounts = accounts.filter(acc => 
			acc.accountGroup?.code === 'PDP' ||
			acc.name.toLowerCase().includes('pendapatan') ||
			acc.name.toLowerCase().includes('penjualan') ||
			acc.name.toLowerCase().includes('revenue')
		);

		const expenseAccounts = accounts.filter(acc => 
			acc.accountGroup?.code?.startsWith('B') ||
			acc.accountGroup?.code === 'COGS' ||
			acc.name.toLowerCase().includes('beban') ||
			acc.name.toLowerCase().includes('biaya') ||
			acc.name.toLowerCase().includes('expense')
		);

		console.log(`Found ${revenueAccounts.length} revenue accounts and ${expenseAccounts.length} expense accounts`);
		console.log('Revenue accounts:', revenueAccounts.map(r => ({ code: r.code, name: r.name, groupCode: r.accountGroup?.code })));
		console.log('Expense accounts:', expenseAccounts.map(e => ({ code: e.code, name: e.name, groupCode: e.accountGroup?.code })));

		// If no accounts found, create some sample accounts first
		if (revenueAccounts.length === 0 || expenseAccounts.length === 0) {
			console.log('No revenue or expense accounts found. Please ensure chart of accounts is seeded first.');
			console.log('Available account groups:');
			const groups = await db.query.accountGroup.findMany();
			groups.forEach(g => console.log(`  - ${g.code}: ${g.name}`));
			return;
		}

		// Sample balance data for revenue accounts
		const revenueBalances = [
			{ amount: 150000000, description: 'Penjualan Bulan Ini' },
			{ amount: 25000000, description: 'Pendapatan Jasa' },
			{ amount: 5000000, description: 'Pendapatan Lain-lain' }
		];

		// Sample balance data for expense accounts
		const expenseBalances = [
			{ amount: 30000000, description: 'Beban Gaji' },
			{ amount: 15000000, description: 'Beban Operasional' },
			{ amount: 8000000, description: 'Beban Sewa' },
			{ amount: 5000000, description: 'Beban Listrik' },
			{ amount: 3000000, description: 'Beban Telepon' },
			{ amount: 2000000, description: 'Beban Transportasi' }
		];

		// Insert revenue account balances
		for (let i = 0; i < Math.min(revenueAccounts.length, revenueBalances.length); i++) {
			const account = revenueAccounts[i];
			const balance = revenueBalances[i];
			
			await db
				.insert(schema.accountBalance)
				.values({
					accountId: account.id,
					fiscalPeriodId: fiscalPeriod.id,
					openingBalance: '0',
					debitMovement: '0',
					creditMovement: balance.amount.toString(),
					closingBalance: balance.amount.toString(),
					createdAt: new Date(),
					updatedAt: new Date()
				})
				.onConflictDoUpdate({
					target: [schema.accountBalance.accountId, schema.accountBalance.fiscalPeriodId],
					set: {
						creditMovement: balance.amount.toString(),
						closingBalance: balance.amount.toString(),
						updatedAt: new Date()
					}
				});
		}

		// Insert expense account balances
		for (let i = 0; i < Math.min(expenseAccounts.length, expenseBalances.length); i++) {
			const account = expenseAccounts[i];
			const balance = expenseBalances[i];
			
			await db
				.insert(schema.accountBalance)
				.values({
					accountId: account.id,
					fiscalPeriodId: fiscalPeriod.id,
					openingBalance: '0',
					debitMovement: balance.amount.toString(),
					creditMovement: '0',
					closingBalance: balance.amount.toString(),
					createdAt: new Date(),
					updatedAt: new Date()
				})
				.onConflictDoUpdate({
					target: [schema.accountBalance.accountId, schema.accountBalance.fiscalPeriodId],
					set: {
						debitMovement: balance.amount.toString(),
						closingBalance: balance.amount.toString(),
						updatedAt: new Date()
					}
				});
		}

		// Seed previous period data for comparison
		const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
		const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
		
		const prevFiscalPeriod = await db.query.fiscalPeriod.findFirst({
			where: and(
				eq(schema.fiscalPeriod.startDate, `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`)
			)
		});

		if (prevFiscalPeriod) {
			console.log('Seeding previous period data...');
			
			// Previous period revenue (slightly lower)
			const prevRevenueBalances = revenueBalances.map(balance => ({
				...balance,
				amount: Math.floor(balance.amount * 0.85)
			}));

			// Previous period expenses (slightly higher)
			const prevExpenseBalances = expenseBalances.map(balance => ({
				...balance,
				amount: Math.floor(balance.amount * 1.1)
			}));

			// Insert previous revenue balances
			for (let i = 0; i < Math.min(revenueAccounts.length, prevRevenueBalances.length); i++) {
				const account = revenueAccounts[i];
				const balance = prevRevenueBalances[i];
				
				await db
					.insert(schema.accountBalance)
					.values({
						accountId: account.id,
						fiscalPeriodId: prevFiscalPeriod.id,
						openingBalance: '0',
						debitMovement: '0',
						creditMovement: balance.amount.toString(),
						closingBalance: balance.amount.toString(),
						createdAt: new Date(),
						updatedAt: new Date()
					})
					.onConflictDoUpdate({
						target: [schema.accountBalance.accountId, schema.accountBalance.fiscalPeriodId],
						set: {
							creditMovement: balance.amount.toString(),
							closingBalance: balance.amount.toString(),
							updatedAt: new Date()
						}
					});
			}

			// Insert previous expense balances
			for (let i = 0; i < Math.min(expenseAccounts.length, prevExpenseBalances.length); i++) {
				const account = expenseAccounts[i];
				const balance = prevExpenseBalances[i];
				
				await db
					.insert(schema.accountBalance)
					.values({
						accountId: account.id,
						fiscalPeriodId: prevFiscalPeriod.id,
						openingBalance: '0',
						debitMovement: balance.amount.toString(),
						creditMovement: '0',
						closingBalance: balance.amount.toString(),
						createdAt: new Date(),
						updatedAt: new Date()
					})
					.onConflictDoUpdate({
						target: [schema.accountBalance.accountId, schema.accountBalance.fiscalPeriodId],
						set: {
							debitMovement: balance.amount.toString(),
							closingBalance: balance.amount.toString(),
							updatedAt: new Date()
						}
					});
			}
		}

		console.log('Account balances seeded successfully!');
		console.log(`Current period: ${fiscalPeriod.name}`);
		if (prevFiscalPeriod) {
			console.log(`Previous period: ${prevFiscalPeriod.name}`);
		}
		
	} catch (error) {
		console.error('Error seeding account balances:', error);
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		}
		process.exit(1);
	} finally {
		console.log('Closing database connection...');
		await pool.end();
		console.log('Database connection closed');
	}
}

main();