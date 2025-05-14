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

// Configure drizzle with schema
const db = drizzle(pool, { schema });

async function main() {
	try {
		// Test the connection
		console.log('Testing database connection...');
		await pool.query('SELECT 1');
		console.log('Database connection successful');

		// Seed Account Types
		console.log('Seeding account types...');
		await db
			.insert(schema.accountType)
			.values([
				{ code: 'RETAINED_EARNING', name: 'Retained Earning', normalBalance: 'CREDIT' },
				{ code: 'PROFIT&LOSS', name: 'Profit & Loss', normalBalance: 'CREDIT' },
				{ code: 'LIABILITY', name: 'Balance (Liabilities)', normalBalance: 'CREDIT' },
				{ code: 'ASSET', name: 'Balance (Assets)', normalBalance: 'DEBIT' }
			])
			.onConflictDoNothing();

		// Get account type IDs
		console.log('Fetching account types...');
		const accountTypes = await db.query.accountType.findMany();
		console.log(`Found ${accountTypes.length} account types`);
		const assetTypeId = accountTypes.find((type) => type.code === 'ASSET')?.id;
		const liabilityTypeId = accountTypes.find((type) => type.code === 'LIABILITY')?.id;
		const profitNLossTypeId = accountTypes.find((type) => type.code === 'PROFIT&LOSS')?.id;
		const retainedTypeId = accountTypes.find((type) => type.code === 'RETAINED_EARNING')?.id;

		// Seed Account Groups
		console.log('Seeding account groups...');
		await db
			.insert(schema.accountGroup)
			.values([
				{
					code: 'RE',
					name: 'Retained Earning',
					accountTypeId: retainedTypeId,
					balanceType: 'CREDIT',
					description: 'Laba (Rugi) Tahun Berjalan'
				},
				{
					code: 'PL_COGS',
					name: 'Profit & Loss',
					accountTypeId: profitNLossTypeId,
					balanceType: 'DEBIT',
					description: 'Harga Pokok (COGS/HPP)'
				},
				{
					code: 'PL_OTHER_EXP',
					name: 'Profit & Loss',
					accountTypeId: profitNLossTypeId,
					balanceType: 'DEBIT',
					description: '(Pendapatan) Biaya Lain-Lain'
				},
				{
					code: 'PL_ADMIN',
					name: 'Profit & Loss',
					accountTypeId: profitNLossTypeId,
					balanceType: 'DEBIT',
					description: 'Biaya Administrasi & Umum'
				},
				{
					code: 'PL_OTHER_OP',
					name: 'Profit & Loss',
					accountTypeId: profitNLossTypeId,
					balanceType: 'DEBIT',
					description: 'Biaya Operasional Lainnya'
				},
				{
					code: 'PL_OP',
					name: 'Profit & Loss',
					accountTypeId: profitNLossTypeId,
					balanceType: 'DEBIT',
					description: 'Biaya Operasional'
				},
				{
					code: 'PL_REV',
					name: 'Profit & Loss',
					accountTypeId: profitNLossTypeId,
					balanceType: 'CREDIT',
					description: 'Pendapatan'
				},
				{
					code: 'LIA_UNEARN',
					name: 'Balance (Liabilities)',
					accountTypeId: liabilityTypeId,
					balanceType: 'CREDIT',
					description: 'Pendapatan dibayar dimuka'
				},
				{
					code: 'LIA_CAPITAL',
					name: 'Balance (Liabilities)',
					accountTypeId: liabilityTypeId,
					balanceType: 'CREDIT',
					description: 'Modal'
				},
				{
					code: 'LIA_LT',
					name: 'Balance (Liabilities)',
					accountTypeId: liabilityTypeId,
					balanceType: 'CREDIT',
					description: 'Hutang Jangka Panjang'
				},
				{
					code: 'LIA_TAX',
					name: 'Balance (Liabilities)',
					accountTypeId: liabilityTypeId,
					balanceType: 'CREDIT',
					description: 'Pajak Yang Masih Harus Dibayar'
				},
				{
					code: 'LIA_ACCRUED',
					name: 'Balance (Liabilities)',
					accountTypeId: liabilityTypeId,
					balanceType: 'CREDIT',
					description: 'Biaya Yang Masih Harus Dibayar'
				},
				{
					code: 'LIA_CURRENT',
					name: 'Balance (Liabilities)',
					accountTypeId: liabilityTypeId,
					balanceType: 'CREDIT',
					description: 'Hutang Lancar'
				},
				{
					code: 'ASSET_OTHER',
					name: 'Balance (Asset)',
					accountTypeId: assetTypeId,
					balanceType: 'DEBIT',
					description: 'Aktiva Lain-Lain'
				},
				{
					code: 'ASSET_ACC_DEP',
					name: 'Balance (Asset)',
					accountTypeId: assetTypeId,
					balanceType: 'CREDIT',
					description: 'Akumulasi Penyusutan'
				},
				{
					code: 'ASSET_FIXED',
					name: 'Balance (Asset)',
					accountTypeId: assetTypeId,
					balanceType: 'DEBIT',
					description: 'Aktiva Tetap'
				},
				{
					code: 'ASSET_CURRENT',
					name: 'Balance (Asset)',
					accountTypeId: assetTypeId,
					balanceType: 'DEBIT',
					description: 'Aktiva Lancar'
				},
				{
					code: 'CASH_AND_EQUIV',
					name: 'Kas dan Setara Kas',
					accountTypeId: assetTypeId,
					balanceType: 'DEBIT',
					description: 'Aset likuid dan lancar'
				}
			])
			.onConflictDoNothing();

		// Get account group IDs
		const accountGroups = await db.query.accountGroup.findMany();

		// Seed Chart of Accounts - Main Categories (Level 1)
		// console.log('Seeding chart of accounts main categories...');
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '1000',
		// 			name: 'ASET',
		// 			description: 'Aset Perusahaan',
		// 			accountTypeId: assetTypeId,
		// 			level: 1
		// 		},
		// 		{
		// 			code: '2000',
		// 			name: 'KEWAJIBAN',
		// 			description: 'Kewajiban Perusahaan',
		// 			accountTypeId: liabilityTypeId,
		// 			level: 1
		// 		},
		// 		{
		// 			code: '3000',
		// 			name: 'EKUITAS',
		// 			description: 'Ekuitas Perusahaan',
		// 			accountTypeId: equityTypeId,
		// 			level: 1
		// 		},
		// 		{
		// 			code: '4000',
		// 			name: 'PENDAPATAN',
		// 			description: 'Pendapatan Perusahaan',
		// 			accountTypeId: revenueTypeId,
		// 			level: 1
		// 		},
		// 		{
		// 			code: '5000',
		// 			name: 'BEBAN',
		// 			description: 'Beban Perusahaan',
		// 			accountTypeId: expenseTypeId,
		// 			level: 1
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Get parent account IDs
		// const accounts = await db.query.chartOfAccount.findMany();
		// const assetParentId = accounts.find((acc) => acc.code === '1000')?.id;
		// const liabilityParentId = accounts.find((acc) => acc.code === '2000')?.id;
		// const equityParentId = accounts.find((acc) => acc.code === '3000')?.id;
		// const revenueParentId = accounts.find((acc) => acc.code === '4000')?.id;
		// const expenseParentId = accounts.find((acc) => acc.code === '5000')?.id;

		// // Seed Chart of Accounts - Subcategories (Level 2)
		// console.log('Seeding chart of accounts subcategories...');

		// // Asset subcategories
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '1100',
		// 			name: 'Aset Lancar',
		// 			accountTypeId: assetTypeId,
		// 			parentId: assetParentId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '1200',
		// 			name: 'Aset Tetap',
		// 			accountTypeId: assetTypeId,
		// 			parentId: assetParentId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '1300',
		// 			name: 'Aset Tidak Berwujud',
		// 			accountTypeId: assetTypeId,
		// 			parentId: assetParentId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '1400',
		// 			name: 'Aset Lainnya',
		// 			accountTypeId: assetTypeId,
		// 			parentId: assetParentId,
		// 			level: 2
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Liability subcategories
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '2100',
		// 			name: 'Kewajiban Jangka Pendek',
		// 			accountTypeId: liabilityTypeId,
		// 			parentId: liabilityParentId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '2200',
		// 			name: 'Kewajiban Jangka Panjang',
		// 			accountTypeId: liabilityTypeId,
		// 			parentId: liabilityParentId,
		// 			level: 2
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Get account group references
		// const capitalGroupId = accountGroups.find((group) => group.code === 'CAPITAL')?.id;
		// const retainedEarningGroupId = accountGroups.find(
		// 	(group) => group.code === 'RETAINED_EARNING'
		// )?.id;
		// const currentEarningGroupId = accountGroups.find(
		// 	(group) => group.code === 'CURRENT_EARNING'
		// )?.id;

		// // Equity subcategories
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '3100',
		// 			name: 'Modal Saham',
		// 			accountTypeId: equityTypeId,
		// 			parentId: equityParentId,
		// 			accountGroupId: capitalGroupId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '3200',
		// 			name: 'Laba Ditahan',
		// 			accountTypeId: equityTypeId,
		// 			parentId: equityParentId,
		// 			accountGroupId: retainedEarningGroupId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '3300',
		// 			name: 'Laba Tahun Berjalan',
		// 			accountTypeId: equityTypeId,
		// 			parentId: equityParentId,
		// 			accountGroupId: currentEarningGroupId,
		// 			level: 2
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Revenue subcategories
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '4100',
		// 			name: 'Pendapatan Operasional',
		// 			accountTypeId: revenueTypeId,
		// 			parentId: revenueParentId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '4200',
		// 			name: 'Pendapatan Non-Operasional',
		// 			accountTypeId: revenueTypeId,
		// 			parentId: revenueParentId,
		// 			level: 2
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Expense subcategories
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '5100',
		// 			name: 'Beban Operasional',
		// 			accountTypeId: expenseTypeId,
		// 			parentId: expenseParentId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '5200',
		// 			name: 'Beban Non-Operasional',
		// 			accountTypeId: expenseTypeId,
		// 			parentId: expenseParentId,
		// 			level: 2
		// 		},
		// 		{
		// 			code: '5300',
		// 			name: 'Beban Pajak',
		// 			accountTypeId: expenseTypeId,
		// 			parentId: expenseParentId,
		// 			level: 2
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Get subcategory account IDs
		// const subAccounts = await db.query.chartOfAccount.findMany();
		// const currentAssetsId = subAccounts.find((acc) => acc.code === '1100')?.id;
		// const fixedAssetsId = subAccounts.find((acc) => acc.code === '1200')?.id;
		// const currentLiabilitiesId = subAccounts.find((acc) => acc.code === '2100')?.id;
		// const operationalExpensesId = subAccounts.find((acc) => acc.code === '5100')?.id;

		// // Seed Chart of Accounts - Detailed Accounts (Level 3)
		// console.log('Seeding detailed accounts...');

		// // Get more account group references
		// const cashGroupId = accountGroups.find((group) => group.code === 'CASH_AND_EQUIV')?.id;
		// const receivableGroupId = accountGroups.find((group) => group.code === 'RECEIVABLE')?.id;

		// // Current Assets
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '1101',
		// 			name: 'Kas',
		// 			accountTypeId: assetTypeId,
		// 			parentId: currentAssetsId,
		// 			accountGroupId: cashGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '1102',
		// 			name: 'Bank',
		// 			accountTypeId: assetTypeId,
		// 			parentId: currentAssetsId,
		// 			accountGroupId: cashGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '1103',
		// 			name: 'Piutang Usaha',
		// 			accountTypeId: assetTypeId,
		// 			parentId: currentAssetsId,
		// 			accountGroupId: receivableGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '1104',
		// 			name: 'Persediaan',
		// 			accountTypeId: assetTypeId,
		// 			parentId: currentAssetsId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '1105',
		// 			name: 'Biaya Dibayar Dimuka',
		// 			accountTypeId: assetTypeId,
		// 			parentId: currentAssetsId,
		// 			level: 3
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Get fixed asset group reference
		// const fixedAssetGroupId = accountGroups.find((group) => group.code === 'FIXED_ASSET')?.id;

		// // Fixed Assets
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '1201',
		// 			name: 'Tanah',
		// 			accountTypeId: assetTypeId,
		// 			parentId: fixedAssetsId,
		// 			accountGroupId: fixedAssetGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '1202',
		// 			name: 'Bangunan',
		// 			accountTypeId: assetTypeId,
		// 			parentId: fixedAssetsId,
		// 			accountGroupId: fixedAssetGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '1203',
		// 			name: 'Kendaraan',
		// 			accountTypeId: assetTypeId,
		// 			parentId: fixedAssetsId,
		// 			accountGroupId: fixedAssetGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '1204',
		// 			name: 'Peralatan & Mesin',
		// 			accountTypeId: assetTypeId,
		// 			parentId: fixedAssetsId,
		// 			accountGroupId: fixedAssetGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '1205',
		// 			name: 'Akumulasi Penyusutan',
		// 			accountTypeId: assetTypeId,
		// 			parentId: fixedAssetsId,
		// 			accountGroupId: fixedAssetGroupId,
		// 			balanceType: 'CREDIT',
		// 			level: 3
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Get liabilities group references
		// const payableGroupId = accountGroups.find((group) => group.code === 'PAYABLE')?.id;
		// const taxGroupId = accountGroups.find((group) => group.code === 'TAX')?.id;

		// // Current Liabilities
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '2101',
		// 			name: 'Hutang Usaha',
		// 			accountTypeId: liabilityTypeId,
		// 			parentId: currentLiabilitiesId,
		// 			accountGroupId: payableGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '2102',
		// 			name: 'Hutang Pajak',
		// 			accountTypeId: liabilityTypeId,
		// 			parentId: currentLiabilitiesId,
		// 			accountGroupId: taxGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '2103',
		// 			name: 'Hutang Gaji',
		// 			accountTypeId: liabilityTypeId,
		// 			parentId: currentLiabilitiesId,
		// 			accountGroupId: payableGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '2104',
		// 			name: 'Uang Muka Pelanggan',
		// 			accountTypeId: liabilityTypeId,
		// 			parentId: currentLiabilitiesId,
		// 			level: 3
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// // Get expense group reference
		// const opexGroupId = accountGroups.find((group) => group.code === 'OPEX')?.id;

		// // Operational Expenses
		// await db
		// 	.insert(schema.chartOfAccount)
		// 	.values([
		// 		{
		// 			code: '5101',
		// 			name: 'Beban Gaji',
		// 			accountTypeId: expenseTypeId,
		// 			parentId: operationalExpensesId,
		// 			accountGroupId: opexGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '5102',
		// 			name: 'Beban Sewa',
		// 			accountTypeId: expenseTypeId,
		// 			parentId: operationalExpensesId,
		// 			accountGroupId: opexGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '5103',
		// 			name: 'Beban Utilitas',
		// 			accountTypeId: expenseTypeId,
		// 			parentId: operationalExpensesId,
		// 			accountGroupId: opexGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '5104',
		// 			name: 'Beban Penyusutan',
		// 			accountTypeId: expenseTypeId,
		// 			parentId: operationalExpensesId,
		// 			accountGroupId: opexGroupId,
		// 			level: 3
		// 		},
		// 		{
		// 			code: '5105',
		// 			name: 'Beban Operasional Lainnya',
		// 			accountTypeId: expenseTypeId,
		// 			parentId: operationalExpensesId,
		// 			accountGroupId: opexGroupId,
		// 			level: 3
		// 		}
		// 	])
		// 	.onConflictDoNothing();

		// Create fiscal periods for the current year
		console.log('Seeding fiscal periods...');
		const currentYear = new Date().getFullYear();

		await db
			.insert(schema.fiscalPeriod)
			.values([
				{
					name: `${currentYear} - Januari`,
					startDate: new Date(`${currentYear}-01-01`),
					endDate: new Date(`${currentYear}-01-31`)
				},
				{
					name: `${currentYear} - Februari`,
					startDate: new Date(`${currentYear}-02-01`),
					endDate: new Date(`${currentYear}-02-${currentYear % 4 === 0 ? '29' : '28'}`)
				},
				{
					name: `${currentYear} - Maret`,
					startDate: new Date(`${currentYear}-03-01`),
					endDate: new Date(`${currentYear}-03-31`)
				},
				{
					name: `${currentYear} - April`,
					startDate: new Date(`${currentYear}-04-01`),
					endDate: new Date(`${currentYear}-04-30`)
				},
				{
					name: `${currentYear} - Mei`,
					startDate: new Date(`${currentYear}-05-01`),
					endDate: new Date(`${currentYear}-05-31`)
				},
				{
					name: `${currentYear} - Juni`,
					startDate: new Date(`${currentYear}-06-01`),
					endDate: new Date(`${currentYear}-06-30`)
				},
				{
					name: `${currentYear} - Juli`,
					startDate: new Date(`${currentYear}-07-01`),
					endDate: new Date(`${currentYear}-07-31`)
				},
				{
					name: `${currentYear} - Agustus`,
					startDate: new Date(`${currentYear}-08-01`),
					endDate: new Date(`${currentYear}-08-31`)
				},
				{
					name: `${currentYear} - September`,
					startDate: new Date(`${currentYear}-09-01`),
					endDate: new Date(`${currentYear}-09-30`)
				},
				{
					name: `${currentYear} - Oktober`,
					startDate: new Date(`${currentYear}-10-01`),
					endDate: new Date(`${currentYear}-10-31`)
				},
				{
					name: `${currentYear} - November`,
					startDate: new Date(`${currentYear}-11-01`),
					endDate: new Date(`${currentYear}-11-30`)
				},
				{
					name: `${currentYear} - Desember`,
					startDate: new Date(`${currentYear}-12-01`),
					endDate: new Date(`${currentYear}-12-31`)
				}
			])
			.onConflictDoNothing();

		// Add report templates
		console.log('Seeding report templates...');
		await db
			.insert(schema.reportTemplate)
			.values([
				{
					name: 'Neraca',
					type: 'BALANCE_SHEET',
					description: 'Laporan posisi keuangan perusahaan'
				},
				{
					name: 'Laba Rugi',
					type: 'INCOME_STATEMENT',
					description: 'Laporan kinerja keuangan perusahaan'
				},
				{
					name: 'Arus Kas',
					type: 'CASH_FLOW',
					description: 'Laporan arus kas perusahaan'
				}
			])
			.onConflictDoNothing();

		console.log('Seeding completed successfully!');
	} catch (error) {
		console.error('Error seeding data:', error);
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
