import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

async function seedChildAccounts() {
	console.log('Seeding chart of accounts child accounts...');

	// Get all parent accounts to create the relationships
	const parentAccounts = await db.select().from(schema.chartOfAccount);
	const parentMap = new Map();

	parentAccounts.forEach((account) => {
		parentMap.set(account.name, account.id);
	});

	console.log('Parent accounts fetched');

	// Get account types
	const accountTypes = await db.select().from(schema.accountType);
	const accountTypeMap = new Map();

	accountTypes.forEach((type) => {
		accountTypeMap.set(type.code, type.id);
	});

	// Get account groups
	const accountGroups = await db.select().from(schema.accountGroup);
	const accountGroupMap = new Map();

	accountGroups.forEach((group) => {
		accountGroupMap.set(group.name, group.id);
	});

	// Child accounts data
	const childAccounts = [
		{
			code: '10101',
			name: 'Kas Kecil',
			parent: 'Kas',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10201',
			name: 'Bank BSI',
			parent: 'Bank',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10202',
			name: 'Bank Mandiri',
			parent: 'Bank',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10203',
			name: 'Bank Garansi',
			parent: 'Bank',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10204',
			name: 'Bank Jatim',
			parent: 'Bank',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10301',
			name: 'Piutang Usaha',
			parent: 'Piutang',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10401',
			name: 'Piutang Pemegang Saham',
			parent: 'Piutang Lain',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10402',
			name: 'Piutang / Pinjaman Karyawan',
			parent: 'Piutang Lain',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10501',
			name: 'Persediaan Barang Dagang',
			parent: 'Persedian',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10601',
			name: 'Asuransi Dibayar Dimuka',
			parent: 'Biaya Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10602',
			name: 'Uang Muka Pembelian',
			parent: 'Biaya Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10603',
			name: 'Uang Muka Lainnya',
			parent: 'Biaya Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10701',
			name: 'PPH Pasal 25',
			parent: 'Pajak Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10702',
			name: 'PPN Masukan',
			parent: 'Pajak Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10703',
			name: 'PPN Lebih Bayar',
			parent: 'Pajak Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10704',
			name: 'PPH Pasal 23',
			parent: 'Pajak Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10705',
			name: 'PPH Pasal 4 ayat (2)',
			parent: 'Pajak Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '10706',
			name: 'PPH Pasal 22',
			parent: 'Pajak Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 2,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '20101',
			name: 'Hutang Jangka Pendek',
			parent: 'Hutang Usaha',
			accountType: 'LIABILITY',
			groupName: 'Hutang Lancar',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '20102',
			name: 'Hutang Jangka Panjang',
			parent: 'Hutang Usaha',
			accountType: 'LIABILITY',
			groupName: 'Hutang Jangka Panjang',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40101',
			name: 'Pendapatan Trading / Penjualan Barang',
			parent: 'Penjualan',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40201',
			name: 'Pendapatan Manage Service',
			parent: 'Jasa',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40202',
			name: 'Pendapatan Internet',
			parent: 'Jasa',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40203',
			name: 'Pendapatan Installasi',
			parent: 'Jasa',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40204',
			name: 'Pendapatan IP Transit',
			parent: 'Jasa',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40205',
			name: 'Pendapatan Metro Ethernet',
			parent: 'Jasa',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40206',
			name: 'Pendapatan Retail',
			parent: 'Jasa',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 2,
			isActive: true,
			balanceType: 'CREDIT'
		}
	];

	// Process child accounts
	for (const account of childAccounts) {
		const parentId = parentMap.get(account.parent);
		const accountTypeId = accountTypeMap.get(account.accountType);
		const accountGroupId = accountGroupMap.get(account.groupName);

		if (!parentId) {
			console.log(`Warning: Parent account ${account.parent} not found for ${account.name}`);
			continue;
		}

		if (!accountTypeId) {
			console.log(`Warning: Account type ${account.accountType} not found for ${account.name}`);
			continue;
		}

		if (!accountGroupId) {
			console.log(`Warning: Account group ${account.groupName} not found for ${account.name}`);
			continue;
		}

		await db
			.insert(schema.chartOfAccount)
			.values({
				code: account.code,
				name: account.name,
				description: `Account untuk ${account.name}`,
				accountTypeId: accountTypeId,
				accountGroupId: accountGroupId,
				parentId: parentId,
				level: account.level,
				isActive: account.isActive,
				isLocked: false,
				balanceType: account.balanceType,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing({ target: schema.chartOfAccount.code });
	}

	console.log('Child accounts seeded');
}

export async function main() {
	try {
		await seedChildAccounts();
		console.log('Chart of accounts child seeding completed successfully');
	} catch (error) {
		console.error('Error seeding chart of accounts child accounts:', error);
		throw error;
	} finally {
		await pool.end();
		console.log('Database connection closed');
	}
}

// Check if file is being run directly in ES modules
const isMainModule = import.meta.url.endsWith('chart-of-accounts-seed-part2.ts');
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error('Failed to seed chart of accounts child accounts:', error);
			process.exit(1);
		});
}
