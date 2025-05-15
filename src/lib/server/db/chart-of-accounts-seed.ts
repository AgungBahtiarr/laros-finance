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

	// Step 1: Seed account types
	const accountTypeData = [
		{ code: 'RETAINED_EARNING', name: 'Retained Earning', normalBalance: 'CREDIT' },
		{ code: 'PROFIT&LOSS', name: 'Profit & Loss', normalBalance: 'CREDIT' },
		{ code: 'LIABILITY', name: 'Balance (Liabilities)', normalBalance: 'CREDIT' },
		{ code: 'ASSET', name: 'Balance (Asset)', normalBalance: 'DEBIT' }
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
		{
			code: 'LR',
			name: 'Laba (Rugi) Tahun Berjalan',
			accountType: 'RETAINED_EARNING',
			balanceType: 'CREDIT'
		},
		{
			code: 'COGS',
			name: 'Harga Pokok (COGS/HPP)',
			accountType: 'PROFIT&LOSS',
			balanceType: 'DEBIT'
		},
		{
			code: 'PBL',
			name: '(Pendapatan) Biaya Lain-Lain',
			accountType: 'PROFIT&LOSS',
			balanceType: 'DEBIT'
		},
		{
			code: 'BAU',
			name: 'Biaya Administrasi & Umum',
			accountType: 'PROFIT&LOSS',
			balanceType: 'DEBIT'
		},
		{
			code: 'BOL',
			name: 'Biaya Operasional Lainnya',
			accountType: 'PROFIT&LOSS',
			balanceType: 'DEBIT'
		},
		{ code: 'BOP', name: 'Biaya Operasional', accountType: 'PROFIT&LOSS', balanceType: 'DEBIT' },
		{ code: 'PDP', name: 'Pendapatan', accountType: 'PROFIT&LOSS', balanceType: 'CREDIT' },
		{
			code: 'PDD',
			name: 'Pendapatan dibayar dimuka',
			accountType: 'LIABILITY',
			balanceType: 'CREDIT'
		},
		{ code: 'MDL', name: 'Modal', accountType: 'LIABILITY', balanceType: 'CREDIT' },
		{ code: 'HJP', name: 'Hutang Jangka Panjang', accountType: 'LIABILITY', balanceType: 'CREDIT' },
		{
			code: 'PYMHD',
			name: 'Pajak Yang Masih Harus Dibayar',
			accountType: 'LIABILITY',
			balanceType: 'CREDIT'
		},
		{
			code: 'BYHD',
			name: 'Biaya Yang Masih Harus Dibayar',
			accountType: 'LIABILITY',
			balanceType: 'CREDIT'
		},
		{ code: 'HL', name: 'Hutang Lancar', accountType: 'LIABILITY', balanceType: 'CREDIT' },
		{ code: 'ALL', name: 'Aktiva Lain-Lain', accountType: 'ASSET', balanceType: 'DEBIT' },
		{ code: 'AP', name: 'Akumulasi Penyusutan', accountType: 'ASSET', balanceType: 'CREDIT' },
		{ code: 'AT', name: 'Aktiva Tetap', accountType: 'ASSET', balanceType: 'DEBIT' },
		{ code: 'AL', name: 'Aktiva Lancar', accountType: 'ASSET', balanceType: 'DEBIT' }
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
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '102',
			name: 'Bank',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '103',
			name: 'Piutang',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '104',
			name: 'Piutang Lain',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '105',
			name: 'Persedian',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '106',
			name: 'Biaya Dibayar Dimuka',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '107',
			name: 'Pajak Dibayar Dimuka',
			groupName: 'Aktiva Lancar',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1101',
			name: 'Tanah & Bangunan',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1102',
			name: 'Mesin & Peralatan',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1103',
			name: 'Inventaris Kantor',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1104',
			name: 'Kendaraan',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1105',
			name: 'Sarana & Prasarana',
			groupName: 'Aktiva Tetap',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1201',
			name: 'Akumulasi Penyusutan Inventaris Kantor',
			groupName: 'Akumulasi Penyusutan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '1301',
			name: 'Uang Jaminan Kendaraan',
			groupName: 'Aktiva Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '1302',
			name: 'Uang Jaminan Lainnya',
			groupName: 'Aktiva Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '201',
			name: 'Hutang Usaha',
			groupName: 'Hutang Lancar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '202',
			name: 'Hutang Usaha Lainnya',
			groupName: 'Hutang Lancar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2021',
			name: 'Hutang Bank',
			groupName: 'Hutang Jangka Panjang',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2101',
			name: 'Hutang Gaji',
			groupName: 'Biaya Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2102',
			name: 'Administrasi Bank Atas Gaji',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2103',
			name: 'THR dan Bonus',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2104',
			name: 'BPJS Ketenagakerjaan',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2105',
			name: 'BPJS Kesehatan',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2106',
			name: 'BHP dan USO',
			groupName: 'Hutang Lancar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2107',
			name: 'Hutang BPJS',
			groupName: 'Hutang Lancar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2108',
			name: 'Hutang Bagi Hasil',
			groupName: 'Biaya Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2201',
			name: 'Hutang PPH Pasal 25',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2202',
			name: 'Hutang PPH Pasal 21',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2203',
			name: 'Hutang PPH Pasal 23',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2204',
			name: 'PPN Keluaran',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2205',
			name: 'Hutang PPh Pasal 4 Ayat 2',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '2206',
			name: 'Hutang PPh Pasal 29',
			groupName: 'Pajak Yang Masih Harus Dibayar',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '3001',
			name: 'Modal Saham Disetor',
			groupName: 'Modal',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '3002',
			name: 'Laba (Rugi) Ditahan',
			groupName: 'Modal',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '3003',
			name: 'Laba (Rugi) Berjalan',
			groupName: 'Laba (Rugi) Tahun Berjalan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '3004',
			name: 'Ikhtisar Laba Rugi',
			groupName: 'Modal',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '401',
			name: 'Penjualan',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '402',
			name: 'Jasa',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40301',
			name: 'Pendapatan Project',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40401',
			name: 'Pendapatan Rack Colocation',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40501',
			name: 'Pendapatan domain',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40601',
			name: 'Pendapatan Bunga Bank',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40701',
			name: 'Penghasilan Final',
			groupName: 'Pendapatan',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '40801',
			name: 'Pendapatan Lain-lain',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'CREDIT'
		},
		{
			code: '5001',
			name: 'Harga Pokok Penjualan',
			groupName: 'Harga Pokok (COGS/HPP)',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6001',
			name: 'Beban Gaji Pegawai',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6002',
			name: 'Beban Project',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6003',
			name: 'Biaya Perlengkapan Kantor & ATK',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6004',
			name: 'Biaya Perjalanan Dinas',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6005',
			name: 'Biaya Pelatihan Karyawan',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6006',
			name: 'Biaya Installasi',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6007',
			name: 'Beban Pajak',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6009',
			name: 'Beban Lain-lain',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6010',
			name: 'Beban Penyusutan Perangkat',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6011',
			name: 'Biaya Honorarium',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6012',
			name: 'Beban PPh Pasal 23',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6101',
			name: 'Beban Cross Connect',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6102',
			name: 'Beban Local Link',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6103',
			name: 'Beban Rack Co-location',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6104',
			name: 'Beban Listrik, Air, Telp',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6105',
			name: 'Beban General Service, Directory Listing, Communication Package',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6106',
			name: 'Beban Sewa Kantor',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6107',
			name: 'Beban Cpanel, domain, SSL Wildcard',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6108',
			name: 'Beban Perlengkapan Usaha Project',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6109',
			name: 'Beban IP Transit',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6110',
			name: 'Beban Perlengkapan Usaha Trading',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6111',
			name: 'Beban Managed Service',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6112',
			name: 'Beban Sewa Radio',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6113',
			name: 'Beban Broadband',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6114',
			name: 'Beban PPN',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6115',
			name: 'Biaya Bank',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6116',
			name: 'Potongan Pembelian',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6201',
			name: 'Beban Kerugian Piutang',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6202',
			name: 'Biaya Kirim',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6203',
			name: 'Biaya Materai',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6204',
			name: 'Biaya Keanggotaan APJII',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6205',
			name: 'Biaya Administrasi',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6206',
			name: 'Biaya Sumbangan',
			groupName: 'Biaya Administrasi & Umum',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6207',
			name: 'Biaya Perizinan dan Legalitas',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6208',
			name: 'Biaya Entertain',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6209',
			name: 'Biaya Reparasi dan Pemeliharaan',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6210',
			name: 'Biaya Perangkat',
			groupName: 'Biaya Operasional Lainnya',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '6211',
			name: 'Biaya Sewa Akses',
			groupName: 'Biaya Operasional',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7001',
			name: 'Bunga Bank',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7002',
			name: 'Pajak Atas Bunga Bank',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7003',
			name: 'Selisih Pembulatan',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7004',
			name: 'Laba (Rugi) Selisih Kurs',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		},
		{
			code: '7005',
			name: 'Beban PPh Badan',
			groupName: '(Pendapatan) Biaya Lain-Lain',
			level: 1,
			isActive: true,
			balanceType: 'DEBIT'
		}
	];

	const accountBatch = [];

	for (const account of accounts) {
		const accountGroupId = accountGroupMap.get(account.groupName);

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
