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
		console.log('=== SETTING UP PROFIT & LOSS REPORT DATA ===\n');

		// Step 1: Create Account Types
		console.log('1. Creating account types...');
		const accountTypeData = [
			{ code: 'ASSET', name: 'Asset', balanceType: 'DEBIT' },
			{ code: 'LIABILITY', name: 'Liability', balanceType: 'CREDIT' },
			{ code: 'EQUITY', name: 'Equity', balanceType: 'CREDIT' },
			{ code: 'REVENUE', name: 'Revenue', balanceType: 'CREDIT' },
			{ code: 'EXPENSE', name: 'Expense', balanceType: 'DEBIT' }
		];

		for (const type of accountTypeData) {
			await db
				.insert(schema.accountType)
				.values({
					code: type.code,
					name: type.name,
					balanceType: type.balanceType,
					createdAt: new Date(),
					updatedAt: new Date()
				})
				.onConflictDoUpdate({
					target: schema.accountType.code,
					set: {
						name: type.name,
						balanceType: type.balanceType,
						updatedAt: new Date()
					}
				});
		}

		// Get account type IDs
		const accountTypes = await db.query.accountType.findMany();
		const typeMap = new Map(accountTypes.map((t) => [t.code, t.id]));

		// Step 2: Create Account Groups
		console.log('2. Creating account groups...');
		const accountGroupData = [
			{ code: 'REV', name: 'Revenue', accountTypeCode: 'REVENUE' },
			{ code: 'EXP', name: 'Expenses', accountTypeCode: 'EXPENSE' },
			{ code: 'COGS', name: 'Cost of Goods Sold', accountTypeCode: 'EXPENSE' }
		];

		for (const group of accountGroupData) {
			const accountTypeId = typeMap.get(group.accountTypeCode);
			if (!accountTypeId) {
				throw new Error(`Account type not found: ${group.accountTypeCode}`);
			}

			await db
				.insert(schema.accountGroup)
				.values({
					code: group.code,
					name: group.name,
					accountTypeId: accountTypeId as number,
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date()
				})
				.onConflictDoNothing();
		}

		// Get account group IDs
		const accountGroups = await db.query.accountGroup.findMany();
		const groupMap = new Map(accountGroups.map((g) => [g.code, g.id]));

		// Step 3: Create Chart of Accounts
		console.log('3. Creating chart of accounts...');
		const chartOfAccountsData = [
			// Revenue Accounts
			{ code: '4001', name: 'Penjualan Produk', groupCode: 'REV' },
			{ code: '4002', name: 'Pendapatan Jasa', groupCode: 'REV' },
			{ code: '4003', name: 'Pendapatan Lain-lain', groupCode: 'REV' },

			// Expense Accounts
			{ code: '5001', name: 'Harga Pokok Penjualan', groupCode: 'COGS' },
			{ code: '6001', name: 'Beban Gaji', groupCode: 'EXP' },
			{ code: '6002', name: 'Beban Sewa', groupCode: 'EXP' },
			{ code: '6003', name: 'Beban Listrik', groupCode: 'EXP' },
			{ code: '6004', name: 'Beban Telepon', groupCode: 'EXP' },
			{ code: '6005', name: 'Beban Transportasi', groupCode: 'EXP' },
			{ code: '6006', name: 'Beban Operasional Lainnya', groupCode: 'EXP' }
		];

		for (const account of chartOfAccountsData) {
			const accountGroupId = groupMap.get(account.groupCode);
			if (!accountGroupId) {
				throw new Error(`Account group not found: ${account.groupCode}`);
			}

			await db
				.insert(schema.chartOfAccount)
				.values({
					code: account.code,
					name: account.name,
					accountGroupId: accountGroupId as number,
					level: 1,
					isActive: true,
					isLocked: false,
					createdAt: new Date(),
					updatedAt: new Date()
				})
				.onConflictDoNothing();
		}

		// Step 4: Create Fiscal Periods
		console.log('4. Creating fiscal periods...');
		const currentYear = new Date().getFullYear();
		const currentMonth = new Date().getMonth() + 1;

		// Create current year fiscal periods
		for (let month = 1; month <= 12; month++) {
			const startDate = `${currentYear}-${month.toString().padStart(2, '0')}-01`;
			const endDate = new Date(currentYear, month, 0).toISOString().split('T')[0];

			await db
				.insert(schema.fiscalPeriod)
				.values({
					name: `${currentYear}-${month.toString().padStart(2, '0')}`,
					startDate,
					endDate,
					isClosed: false,
					createdAt: new Date(),
					updatedAt: new Date()
				})
				.onConflictDoNothing();
		}

		// Create previous year fiscal periods for comparison
		const prevYear = currentYear - 1;
		for (let month = 1; month <= 12; month++) {
			const startDate = `${prevYear}-${month.toString().padStart(2, '0')}-01`;
			const endDate = new Date(prevYear, month, 0).toISOString().split('T')[0];

			await db
				.insert(schema.fiscalPeriod)
				.values({
					name: `${prevYear}-${month.toString().padStart(2, '0')}`,
					startDate,
					endDate,
					isClosed: false,
					createdAt: new Date(),
					updatedAt: new Date()
				})
				.onConflictDoNothing();
		}

		// Step 5: Create Account Balances with Sample Data
		console.log('5. Creating account balances...');

		// Get current period
		const currentPeriod = await db.query.fiscalPeriod.findFirst({
			where: eq(
				schema.fiscalPeriod.name,
				`${currentYear}-${currentMonth.toString().padStart(2, '0')}`
			)
		});

		// Get previous period
		const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
		const prevPeriodYear = currentMonth === 1 ? currentYear - 1 : currentYear;
		const previousPeriod = await db.query.fiscalPeriod.findFirst({
			where: eq(
				schema.fiscalPeriod.name,
				`${prevPeriodYear}-${prevMonth.toString().padStart(2, '0')}`
			)
		});

		// Get accounts
		const accounts = await db.query.chartOfAccount.findMany({
			with: {
				accountGroup: {
					with: { accountType: true }
				}
			}
		});

		const sampleBalances = {
			'4001': { current: 120000000, previous: 100000000 }, // Penjualan Produk
			'4002': { current: 45000000, previous: 40000000 }, // Pendapatan Jasa
			'4003': { current: 15000000, previous: 12000000 }, // Pendapatan Lain-lain
			'5001': { current: 50000000, previous: 45000000 }, // Harga Pokok Penjualan
			'6001': { current: 35000000, previous: 32000000 }, // Beban Gaji
			'6002': { current: 12000000, previous: 12000000 }, // Beban Sewa
			'6003': { current: 8000000, previous: 7500000 }, // Beban Listrik
			'6004': { current: 3000000, previous: 2800000 }, // Beban Telepon
			'6005': { current: 5000000, previous: 4500000 }, // Beban Transportasi
			'6006': { current: 7000000, previous: 6500000 } // Beban Operasional Lainnya
		};

		// Insert current period balances
		if (currentPeriod) {
			for (const account of accounts) {
				const balance = sampleBalances[account.code as keyof typeof sampleBalances];
				if (balance) {
					const isRevenue = account.accountGroup?.accountType?.code === 'REVENUE';
					const isExpense = account.accountGroup?.accountType?.code === 'EXPENSE';

					await db
						.insert(schema.accountBalance)
						.values({
							accountId: account.id,
							fiscalPeriodId: currentPeriod.id,
							openingBalance: '0',
							debitMovement: isExpense ? balance.current.toString() : '0',
							creditMovement: isRevenue ? balance.current.toString() : '0',
							closingBalance: balance.current.toString(),
							createdAt: new Date(),
							updatedAt: new Date()
						})
						.onConflictDoUpdate({
							target: [schema.accountBalance.accountId, schema.accountBalance.fiscalPeriodId],
							set: {
								debitMovement: isExpense ? balance.current.toString() : '0',
								creditMovement: isRevenue ? balance.current.toString() : '0',
								closingBalance: balance.current.toString(),
								updatedAt: new Date()
							}
						});
				}
			}
		}

		// Insert previous period balances for comparison
		if (previousPeriod) {
			for (const account of accounts) {
				const balance = sampleBalances[account.code as keyof typeof sampleBalances];
				if (balance) {
					const isRevenue = account.accountGroup?.accountType?.code === 'REVENUE';
					const isExpense = account.accountGroup?.accountType?.code === 'EXPENSE';

					await db
						.insert(schema.accountBalance)
						.values({
							accountId: account.id,
							fiscalPeriodId: previousPeriod.id,
							openingBalance: '0',
							debitMovement: isExpense ? balance.previous.toString() : '0',
							creditMovement: isRevenue ? balance.previous.toString() : '0',
							closingBalance: balance.previous.toString(),
							createdAt: new Date(),
							updatedAt: new Date()
						})
						.onConflictDoUpdate({
							target: [schema.accountBalance.accountId, schema.accountBalance.fiscalPeriodId],
							set: {
								debitMovement: isExpense ? balance.previous.toString() : '0',
								creditMovement: isRevenue ? balance.previous.toString() : '0',
								closingBalance: balance.previous.toString(),
								updatedAt: new Date()
							}
						});
				}
			}
		}

		console.log('\n=== SETUP COMPLETE ===');
		console.log('✅ Account types created');
		console.log('✅ Account groups created');
		console.log('✅ Chart of accounts created');
		console.log('✅ Fiscal periods created');
		console.log('✅ Sample account balances created');
		console.log('\nProfit & Loss report is now ready to use!');
		console.log(`Current period: ${currentPeriod?.name}`);
		console.log(`Previous period: ${previousPeriod?.name}`);

		// Calculate sample totals
		const totalRevenue = Object.values(sampleBalances)
			.filter((_, index) => index < 3)
			.reduce((sum, balance) => sum + balance.current, 0);
		const totalExpense = Object.values(sampleBalances)
			.filter((_, index) => index >= 3)
			.reduce((sum, balance) => sum + balance.current, 0);
		const netIncome = totalRevenue - totalExpense;

		console.log(`\nSample Data Summary:`);
		console.log(`Total Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}`);
		console.log(`Total Expense: Rp ${totalExpense.toLocaleString('id-ID')}`);
		console.log(`Net Income: Rp ${netIncome.toLocaleString('id-ID')}`);
	} catch (error) {
		console.error('Error setting up profit & loss data:', error);
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		}
		process.exit(1);
	} finally {
		console.log('\nClosing database connection...');
		await pool.end();
		console.log('Database connection closed');
	}
}

main();
