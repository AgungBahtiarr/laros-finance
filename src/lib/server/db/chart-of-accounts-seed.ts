import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

async function seedChartOfAccounts() {
	console.log('Seeding chart of accounts...');

	// First, let's ensure we have account types
	const accountTypeData = [
		{ code: 'ASSET', name: 'Asset', normalBalance: 'DEBIT' },
		{ code: 'LIABILITY', name: 'Liability', normalBalance: 'CREDIT' },
		{ code: 'EQUITY', name: 'Equity', normalBalance: 'CREDIT' },
		{ code: 'REVENUE', name: 'Revenue', normalBalance: 'CREDIT' },
		{ code: 'EXPENSE', name: 'Expense', normalBalance: 'DEBIT' }
	];

	for (const type of accountTypeData) {
		await db
			.insert(schema.accountType)
			.values({
				code: type.code,
				name: type.name,
				normalBalance: type.normalBalance,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing({ target: schema.accountType.code });
	}

	console.log('Account types seeded');

	// Get the IDs of the account types we just created
	const accountTypes = await db.select().from(schema.accountType);
	const accountTypeMap = new Map();

	accountTypes.forEach((type) => {
		accountTypeMap.set(type.code, type.id);
	});

	console.log('Account types fetched:', accountTypeMap);

	// Then seed account groups with the correct type IDs
	const accountGroups = [
		{ code: 'AL', name: 'Aktiva Lancar', accountType: 'ASSET', balanceType: 'DEBIT' },
		{ code: 'AT', name: 'Aktiva Tetap', accountType: 'ASSET', balanceType: 'DEBIT' },
		{ code: 'AP', name: 'Akumulasi Penyusutan', accountType: 'ASSET', balanceType: 'CREDIT' },
		{ code: 'ALL', name: 'Aktiva Lain-Lain', accountType: 'ASSET', balanceType: 'DEBIT' },
		{ code: 'HL', name: 'Hutang Lancar', accountType: 'LIABILITY', balanceType: 'CREDIT' },
		{ code: 'HJP', name: 'Hutang Jangka Panjang', accountType: 'LIABILITY', balanceType: 'CREDIT' },
		{
			code: 'BYHD',
			name: 'Biaya Yang Masih Harus Dibayar',
			accountType: 'LIABILITY',
			balanceType: 'CREDIT'
		},
		{
			code: 'PYMHD',
			name: 'Pajak Yang Masih Harus Dibayar',
			accountType: 'LIABILITY',
			balanceType: 'CREDIT'
		},
		{ code: 'MDL', name: 'Modal', accountType: 'EQUITY', balanceType: 'CREDIT' },
		{
			code: 'LR',
			name: 'Laba (Rugi) Tahun Berjalan',
			accountType: 'EQUITY',
			balanceType: 'CREDIT'
		},
		{ code: 'PDP', name: 'Pendapatan', accountType: 'REVENUE', balanceType: 'CREDIT' },
		{ code: 'COGS', name: 'Harga Pokok (COGS/HPP)', accountType: 'EXPENSE', balanceType: 'DEBIT' },
		{ code: 'BOP', name: 'Biaya Operasional', accountType: 'EXPENSE', balanceType: 'DEBIT' },
		{
			code: 'BOL',
			name: 'Biaya Operasional Lainnya',
			accountType: 'EXPENSE',
			balanceType: 'DEBIT'
		},
		{
			code: 'BAU',
			name: 'Biaya Administrasi & Umum',
			accountType: 'EXPENSE',
			balanceType: 'DEBIT'
		},
		{
			code: 'PBL',
			name: '(Pendapatan) Biaya Lain-Lain',
			accountType: 'EXPENSE',
			balanceType: 'DEBIT'
		}
	];

	for (const group of accountGroups) {
		const accountTypeId = accountTypeMap.get(group.accountType);
		if (!accountTypeId) {
			console.log(`Warning: Account type ${group.accountType} not found for group ${group.name}`);
			continue;
		}

		await db
			.insert(schema.accountGroup)
			.values({
				code: group.code,
				name: group.name,
				accountTypeId: accountTypeId,
				balanceType: group.balanceType,
				description: `Account group for ${group.name}`,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing({ target: schema.accountGroup.code });
	}

	console.log('Account groups seeded');

	// Get the IDs of the account groups we just created
	const accountGroups2 = await db.select().from(schema.accountGroup);
	const accountGroupMap = new Map();

	accountGroups2.forEach((group) => {
		accountGroupMap.set(group.name, group.id);
	});

	console.log('Account groups fetched:', accountGroupMap);

	// Now seed the chart of accounts (parent accounts)
	// We'll map group names to IDs
	const accounts = [
		// Main accounts (level 1)
		{
			code: '101',
			name: 'Kas',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '102',
			name: 'Bank',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '103',
			name: 'Piutang',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '104',
			name: 'Piutang Lain',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '105',
			name: 'Persedian',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '106',
			name: 'Biaya Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '107',
			name: 'Pajak Dibayar Dimuka',
			accountType: 'ASSET',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1101',
			name: 'Tanah & Bangunan',
			accountType: 'ASSET',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1102',
			name: 'Mesin & Peralatan',
			accountType: 'ASSET',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1103',
			name: 'Inventaris Kantor',
			accountType: 'ASSET',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1104',
			name: 'Kendaraan',
			accountType: 'ASSET',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1105',
			name: 'Sarana & Prasarana',
			accountType: 'ASSET',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1201',
			name: 'Akumulasi Penyusutan Inventaris Kantor',
			accountType: 'ASSET',
			groupName: 'Akumulasi Penyusutan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '1301',
			name: 'Uang Jaminan Kendaraan',
			accountType: 'ASSET',
			groupName: 'Aktiva Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1302',
			name: 'Uang Jaminan Lainnya',
			accountType: 'ASSET',
			groupName: 'Aktiva Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '201',
			name: 'Hutang Usaha',
			accountType: 'LIABILITY',
			groupName: 'Hutang Lancar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '202',
			name: 'Hutang Usaha Lainnya',
			accountType: 'LIABILITY',
			groupName: 'Hutang Lancar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2021',
			name: 'Hutang Bank',
			accountType: 'LIABILITY',
			groupName: 'Hutang Jangka Panjang',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2101',
			name: 'Hutang Gaji',
			accountType: 'LIABILITY',
			groupName: 'Biaya Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2102',
			name: 'Administrasi Bank Atas Gaji',
			accountType: 'LIABILITY',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2103',
			name: 'THR dan Bonus',
			accountType: 'LIABILITY',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2104',
			name: 'BPJS Ketenagakerjaan',
			accountType: 'LIABILITY',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2105',
			name: 'BPJS Kesehatan',
			accountType: 'LIABILITY',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2106',
			name: 'BHP dan USO',
			accountType: 'LIABILITY',
			groupName: 'Hutang Lancar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2107',
			name: 'Hutang BPJS',
			accountType: 'LIABILITY',
			groupName: 'Hutang Lancar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2108',
			name: 'Hutang Bagi Hasil',
			accountType: 'LIABILITY',
			groupName: 'Biaya Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2201',
			name: 'Hutang PPH Pasal 25',
			accountType: 'LIABILITY',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2202',
			name: 'Hutang PPH Pasal 21',
			accountType: 'LIABILITY',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2203',
			name: 'Hutang PPH Pasal 23',
			accountType: 'LIABILITY',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2204',
			name: 'PPN Keluaran',
			accountType: 'LIABILITY',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2205',
			name: 'Hutang PPh Pasal 4 Ayat 2',
			accountType: 'LIABILITY',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2206',
			name: 'Hutang PPh Pasal 29',
			accountType: 'LIABILITY',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '3001',
			name: 'Modal Saham Disetor',
			accountType: 'EQUITY',
			groupName: 'Modal',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '3002',
			name: 'Laba (Rugi) Ditahan',
			accountType: 'EQUITY',
			groupName: 'Modal',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '3003',
			name: 'Laba (Rugi) Berjalan',
			accountType: 'EQUITY',
			groupName: 'Laba (Rugi) Tahun Berjalan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '3004',
			name: 'Ikhtisar Laba Rugi',
			accountType: 'EQUITY',
			groupName: 'Modal',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '401',
			name: 'Penjualan',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '402',
			name: 'Jasa',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40301',
			name: 'Pendapatan Project',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40401',
			name: 'Pendapatan Rack Colocation',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40501',
			name: 'Pendapatan domain',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40601',
			name: 'Pendapatan Bunga Bank',
			accountType: 'REVENUE',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40701',
			name: 'Penghasilan Final',
			accountType: 'REVENUE',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40801',
			name: 'Pendapatan Lain-lain',
			accountType: 'REVENUE',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '5001',
			name: 'Harga Pokok Penjualan',
			accountType: 'EXPENSE',
			groupName: 'Harga Pokok (COGS/HPP)',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6001',
			name: 'Beban Gaji Pegawai',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6002',
			name: 'Beban Project',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6003',
			name: 'Biaya Perlengkapan Kantor & ATK',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6004',
			name: 'Biaya Perjalanan Dinas',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6005',
			name: 'Biaya Pelatihan Karyawan',
			accountType: 'EXPENSE',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6006',
			name: 'Biaya Installasi',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6007',
			name: 'Beban Pajak',
			accountType: 'EXPENSE',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6009',
			name: 'Beban Lain-lain',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6010',
			name: 'Beban Penyusutan Perangkat',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6011',
			name: 'Biaya Honorarium',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6012',
			name: 'Beban PPh Pasal 23',
			accountType: 'EXPENSE',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6101',
			name: 'Beban Cross Connect',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6102',
			name: 'Beban Local Link',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6103',
			name: 'Beban Rack Co-location',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6104',
			name: 'Beban Listrik, Air, Telp',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6105',
			name: 'Beban General Service, Directory Listing, Communication Package',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6106',
			name: 'Beban Sewa Kantor',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6107',
			name: 'Beban Cpanel, domain, SSL Wildcard',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6108',
			name: 'Beban Perlengkapan Usaha Project',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6109',
			name: 'Beban IP Transit',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6110',
			name: 'Beban Perlengkapan Usaha Trading',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6111',
			name: 'Beban Managed Service',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6112',
			name: 'Beban Sewa Radio',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6113',
			name: 'Beban Broadband',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6114',
			name: 'Beban PPN',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6115',
			name: 'Biaya Bank',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6116',
			name: 'Potongan Pembelian',
			accountType: 'EXPENSE',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6201',
			name: 'Beban Kerugian Piutang',
			accountType: 'EXPENSE',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6202',
			name: 'Biaya Kirim',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6203',
			name: 'Biaya Materai',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6204',
			name: 'Biaya Keanggotaan APJII',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6205',
			name: 'Biaya Administrasi',
			accountType: 'EXPENSE',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6206',
			name: 'Biaya Sumbangan',
			accountType: 'EXPENSE',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6207',
			name: 'Biaya Perizinan dan Legalitas',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6208',
			name: 'Biaya Entertain',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6209',
			name: 'Biaya Reparasi dan Pemeliharaan',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6210',
			name: 'Biaya Perangkat',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6211',
			name: 'Biaya Sewa Akses',
			accountType: 'EXPENSE',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7001',
			name: 'Bunga Bank',
			accountType: 'EXPENSE',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7002',
			name: 'Pajak Atas Bunga Bank',
			accountType: 'EXPENSE',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7003',
			name: 'Selisih Pembulatan',
			accountType: 'EXPENSE',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7004',
			name: 'Laba (Rugi) Selisih Kurs',
			accountType: 'EXPENSE',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7005',
			name: 'Beban PPh Badan',
			accountType: 'EXPENSE',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		}
	];

	const accountBatch = [];

	for (const account of accounts) {
		const accountTypeId = accountTypeMap.get(account.accountType);
		const accountGroupId = accountGroupMap.get(account.groupName);

		if (!accountTypeId) {
			console.log(
				`Warning: Account type ${account.accountType} not found for account ${account.name}`
			);
			continue;
		}

		if (!accountGroupId) {
			console.log(
				`Warning: Account group ${account.groupName} not found for account ${account.name}`
			);
			continue;
		}

		accountBatch.push({
			code: account.code,
			name: account.name,
			description: `Account untuk ${account.name}`,
			accountTypeId: accountTypeId,
			accountGroupId: accountGroupId,
			parentId: null,
			level: account.level,
			isActive: account.isActive,
			isLocked: false,
			balanceType: account.balanceType,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	}

	if (accountBatch.length > 0) {
		await db
			.insert(schema.chartOfAccount)
			.values(accountBatch)
			.onConflictDoNothing({ target: schema.chartOfAccount.code });
	}

	console.log('Base accounts seeded');

	// Get all parent accounts to create the relationships
	const parentAccounts = await db.select().from(schema.chartOfAccount);
	const parentMap = new Map();

	parentAccounts.forEach((account) => {
		parentMap.set(account.name, account.id);
	});

	console.log('Parent accounts fetched');

	// Now seed the child accounts
	// We'll just log out the successful completion - child accounts are handled by the second part
	console.log('Chart of accounts main seeding completed successfully');
}

export async function main() {
	try {
		await seedChartOfAccounts();
		console.log('Chart of accounts base seeding completed successfully');
	} catch (error) {
		console.error('Error seeding chart of accounts:', error);
		throw error;
	} finally {
		await pool.end();
		console.log('Database connection closed');
	}
}

// Check if file is being run directly in ES modules
const isMainModule = import.meta.url.endsWith('chart-of-accounts-seed.ts');
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error('Failed to seed chart of accounts:', error);
			process.exit(1);
		});
}
