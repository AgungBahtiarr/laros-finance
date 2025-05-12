import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const db = drizzle({ client: pool });

async function main() {
    try {
        // Seed Account Types
        console.log('Seeding account types...');
        await db.insert(schema.accountType).values([
            { code: 'ASSET', name: 'Asset', normalBalance: 'DEBIT' },
            { code: 'LIABILITY', name: 'Liability', normalBalance: 'CREDIT' },
            { code: 'EQUITY', name: 'Equity', normalBalance: 'CREDIT' },
            { code: 'REVENUE', name: 'Revenue', normalBalance: 'CREDIT' },
            { code: 'EXPENSE', name: 'Expense', normalBalance: 'DEBIT' }
        ]).onConflictDoNothing();

        // Get account type IDs
        const accountTypes = await db.query.accountType.findMany();
        const assetTypeId = accountTypes.find(type => type.code === 'ASSET')?.id;
        const liabilityTypeId = accountTypes.find(type => type.code === 'LIABILITY')?.id;
        const equityTypeId = accountTypes.find(type => type.code === 'EQUITY')?.id;
        const revenueTypeId = accountTypes.find(type => type.code === 'REVENUE')?.id;
        const expenseTypeId = accountTypes.find(type => type.code === 'EXPENSE')?.id;

        // Seed Chart of Accounts - Main Categories (Level 1)
        console.log('Seeding chart of accounts main categories...');
        await db.insert(schema.chartOfAccount).values([
            { code: '1000', name: 'ASET', description: 'Aset Perusahaan', accountTypeId: assetTypeId, level: 1 },
            { code: '2000', name: 'KEWAJIBAN', description: 'Kewajiban Perusahaan', accountTypeId: liabilityTypeId, level: 1 },
            { code: '3000', name: 'EKUITAS', description: 'Ekuitas Perusahaan', accountTypeId: equityTypeId, level: 1 },
            { code: '4000', name: 'PENDAPATAN', description: 'Pendapatan Perusahaan', accountTypeId: revenueTypeId, level: 1 },
            { code: '5000', name: 'BEBAN', description: 'Beban Perusahaan', accountTypeId: expenseTypeId, level: 1 },
        ]).onConflictDoNothing();

        // Get parent account IDs
        const accounts = await db.query.chartOfAccount.findMany();
        const assetParentId = accounts.find(acc => acc.code === '1000')?.id;
        const liabilityParentId = accounts.find(acc => acc.code === '2000')?.id;
        const equityParentId = accounts.find(acc => acc.code === '3000')?.id;
        const revenueParentId = accounts.find(acc => acc.code === '4000')?.id;
        const expenseParentId = accounts.find(acc => acc.code === '5000')?.id;

        // Seed Chart of Accounts - Subcategories (Level 2)
        console.log('Seeding chart of accounts subcategories...');
        
        // Asset subcategories
        await db.insert(schema.chartOfAccount).values([
            { code: '1100', name: 'Aset Lancar', accountTypeId: assetTypeId, parentId: assetParentId, level: 2 },
            { code: '1200', name: 'Aset Tetap', accountTypeId: assetTypeId, parentId: assetParentId, level: 2 },
            { code: '1300', name: 'Aset Tidak Berwujud', accountTypeId: assetTypeId, parentId: assetParentId, level: 2 },
            { code: '1400', name: 'Aset Lainnya', accountTypeId: assetTypeId, parentId: assetParentId, level: 2 },
        ]).onConflictDoNothing();

        // Liability subcategories
        await db.insert(schema.chartOfAccount).values([
            { code: '2100', name: 'Kewajiban Jangka Pendek', accountTypeId: liabilityTypeId, parentId: liabilityParentId, level: 2 },
            { code: '2200', name: 'Kewajiban Jangka Panjang', accountTypeId: liabilityTypeId, parentId: liabilityParentId, level: 2 },
        ]).onConflictDoNothing();

        // Equity subcategories
        await db.insert(schema.chartOfAccount).values([
            { code: '3100', name: 'Modal Saham', accountTypeId: equityTypeId, parentId: equityParentId, level: 2 },
            { code: '3200', name: 'Laba Ditahan', accountTypeId: equityTypeId, parentId: equityParentId, level: 2 },
            { code: '3300', name: 'Laba Tahun Berjalan', accountTypeId: equityTypeId, parentId: equityParentId, level: 2 },
        ]).onConflictDoNothing();

        // Revenue subcategories
        await db.insert(schema.chartOfAccount).values([
            { code: '4100', name: 'Pendapatan Operasional', accountTypeId: revenueTypeId, parentId: revenueParentId, level: 2 },
            { code: '4200', name: 'Pendapatan Non-Operasional', accountTypeId: revenueTypeId, parentId: revenueParentId, level: 2 },
        ]).onConflictDoNothing();

        // Expense subcategories
        await db.insert(schema.chartOfAccount).values([
            { code: '5100', name: 'Beban Operasional', accountTypeId: expenseTypeId, parentId: expenseParentId, level: 2 },
            { code: '5200', name: 'Beban Non-Operasional', accountTypeId: expenseTypeId, parentId: expenseParentId, level: 2 },
            { code: '5300', name: 'Beban Pajak', accountTypeId: expenseTypeId, parentId: expenseParentId, level: 2 },
        ]).onConflictDoNothing();

        // Get subcategory account IDs
        const subAccounts = await db.query.chartOfAccount.findMany();
        const currentAssetsId = subAccounts.find(acc => acc.code === '1100')?.id;
        const fixedAssetsId = subAccounts.find(acc => acc.code === '1200')?.id;
        const currentLiabilitiesId = subAccounts.find(acc => acc.code === '2100')?.id;
        const operationalExpensesId = subAccounts.find(acc => acc.code === '5100')?.id;

        // Seed Chart of Accounts - Detailed Accounts (Level 3)
        console.log('Seeding detailed accounts...');
        
        // Current Assets
        await db.insert(schema.chartOfAccount).values([
            { code: '1101', name: 'Kas', accountTypeId: assetTypeId, parentId: currentAssetsId, level: 3 },
            { code: '1102', name: 'Bank', accountTypeId: assetTypeId, parentId: currentAssetsId, level: 3 },
            { code: '1103', name: 'Piutang Usaha', accountTypeId: assetTypeId, parentId: currentAssetsId, level: 3 },
            { code: '1104', name: 'Persediaan', accountTypeId: assetTypeId, parentId: currentAssetsId, level: 3 },
            { code: '1105', name: 'Biaya Dibayar Dimuka', accountTypeId: assetTypeId, parentId: currentAssetsId, level: 3 },
        ]).onConflictDoNothing();

        // Fixed Assets
        await db.insert(schema.chartOfAccount).values([
            { code: '1201', name: 'Tanah', accountTypeId: assetTypeId, parentId: fixedAssetsId, level: 3 },
            { code: '1202', name: 'Bangunan', accountTypeId: assetTypeId, parentId: fixedAssetsId, level: 3 },
            { code: '1203', name: 'Kendaraan', accountTypeId: assetTypeId, parentId: fixedAssetsId, level: 3 },
            { code: '1204', name: 'Peralatan & Mesin', accountTypeId: assetTypeId, parentId: fixedAssetsId, level: 3 },
            { code: '1205', name: 'Akumulasi Penyusutan', accountTypeId: assetTypeId, parentId: fixedAssetsId, level: 3 },
        ]).onConflictDoNothing();

        // Current Liabilities
        await db.insert(schema.chartOfAccount).values([
            { code: '2101', name: 'Hutang Usaha', accountTypeId: liabilityTypeId, parentId: currentLiabilitiesId, level: 3 },
            { code: '2102', name: 'Hutang Pajak', accountTypeId: liabilityTypeId, parentId: currentLiabilitiesId, level: 3 },
            { code: '2103', name: 'Hutang Gaji', accountTypeId: liabilityTypeId, parentId: currentLiabilitiesId, level: 3 },
            { code: '2104', name: 'Uang Muka Pelanggan', accountTypeId: liabilityTypeId, parentId: currentLiabilitiesId, level: 3 },
        ]).onConflictDoNothing();

        // Operational Expenses
        await db.insert(schema.chartOfAccount).values([
            { code: '5101', name: 'Beban Gaji', accountTypeId: expenseTypeId, parentId: operationalExpensesId, level: 3 },
            { code: '5102', name: 'Beban Sewa', accountTypeId: expenseTypeId, parentId: operationalExpensesId, level: 3 },
            { code: '5103', name: 'Beban Utilitas', accountTypeId: expenseTypeId, parentId: operationalExpensesId, level: 3 },
            { code: '5104', name: 'Beban Penyusutan', accountTypeId: expenseTypeId, parentId: operationalExpensesId, level: 3 },
            { code: '5105', name: 'Beban Operasional Lainnya', accountTypeId: expenseTypeId, parentId: operationalExpensesId, level: 3 },
        ]).onConflictDoNothing();

        // Create fiscal periods for the current year
        console.log('Seeding fiscal periods...');
        const currentYear = new Date().getFullYear();
        
        await db.insert(schema.fiscalPeriod).values([
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
            },
        ]).onConflictDoNothing();

        // Add report templates
        console.log('Seeding report templates...');
        await db.insert(schema.reportTemplate).values([
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
            },
        ]).onConflictDoNothing();

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await pool.end();
    }
}

main();