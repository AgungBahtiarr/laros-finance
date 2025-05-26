import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
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
		console.log('=== DATABASE INSPECTION ===\n');

		// Check fiscal periods
		console.log('1. FISCAL PERIODS:');
		const fiscalPeriods = await db.query.fiscalPeriod.findMany();
		console.log(`Found ${fiscalPeriods.length} fiscal periods:`);
		fiscalPeriods.forEach(fp => {
			console.log(`  - ${fp.name}: ${fp.startDate} to ${fp.endDate}`);
		});
		console.log('');

		// Check account types
		console.log('2. ACCOUNT TYPES:');
		const accountTypes = await db.query.accountType.findMany();
		console.log(`Found ${accountTypes.length} account types:`);
		accountTypes.forEach(at => {
			console.log(`  - ${at.code}: ${at.name} (${at.balanceType})`);
		});
		console.log('');

		// Check account groups
		console.log('3. ACCOUNT GROUPS:');
		const accountGroups = await db.query.accountGroup.findMany({
			with: { accountType: true }
		});
		console.log(`Found ${accountGroups.length} account groups:`);
		accountGroups.forEach(ag => {
			console.log(`  - ${ag.code}: ${ag.name} (
Type: ${ag.accountType?.code})`);
		});
		console.log('');

		// Check chart of accounts
		console.log('4. CHART OF ACCOUNTS:');
		const chartOfAccounts = await db.query.chartOfAccount.findMany({
			with: {
				accountGroup: {
					with: { accountType: true }
				}
			}
		});
		console.log(`Found ${chartOfAccounts.length} accounts:`);
		chartOfAccounts.forEach(coa => {
			console.log(`  - ${coa.code}: ${coa.name} (Group: ${coa.accountGroup?.code}, Type: ${coa.accountGroup?.accountType?.code})`);
		});
		console.log('');

		// Check account balances
		console.log('5. ACCOUNT BALANCES:');
		const accountBalances = await db.query.accountBalance.findMany({
			with: {
				account: {
					with: {
						accountGroup: {
							with: { accountType: true }
						}
					}
				},
				fiscalPeriod: true
			}
		});
		console.log
(`Found ${accountBalances.length} account balances:`);
		accountBalances.forEach(ab => {
			console.log(`  - ${ab.account?.code}: ${ab.account?.name}`);
			console.log(`    Period: ${ab.fiscalPeriod?.name}`);
			console.log(`    Opening: ${ab.openingBalance}, Debit: ${ab.debitMovement}, Credit: ${ab.creditMovement}, Closing: ${ab.closingBalance}`);
			console.log(`    Type: ${ab.account?.accountGroup?.accountType?.code}, Group: ${ab.account?.accountGroup?.code}`);
			console.log('');
		});

		// Summary
		console.log('=== SUMMARY ===');
		console.log(`Fiscal Periods: ${fiscalPeriods.length}`);
		console.log(`Account Types: ${accountTypes.length}`);
		console.log(`Account Groups: ${accountGroups.length}`);
		console.log(`Chart of Accounts: ${chartOfAccounts.length}`);
		console.log(`Account Balances: ${accountBalances.length}`);

		// Current date info
		const currentDate = new Date().toISOString().split('T')[0];
		console.log(`\nCurrent date: ${currentDate}`);
		
		// Check if current period exists
		const currentPeriod = fiscalPeriods.find(fp => 
			fp.startDate <= currentDate && fp.endDate >= currentDate
		);
		console.log(`Current period found: ${currentPeriod ? currentPeriod.name : 'NO'}`);

	} catch (error) {
		console.error('Error inspecting database:', error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

main();