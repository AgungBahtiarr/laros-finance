import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { authClient } from '$lib/auth-client-seed';
import 'dotenv/config';

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

const db = drizzle({ client: pool });

async function main() {
	const jenisHarta = await db
		.insert(schema.jenisHarta)
		.values([
			{ keterangan: 'Harta Berwujud', daftar: 'Penyusutan Fiskal' },
			{ keterangan: 'Kelompok Bangunan', daftar: 'Penyusutan Fiskal' },
			{ keterangan: 'Harta Tak Berwujud', daftar: 'Amortisasi Fiskal' }
		])
		.onConflictDoNothing();
	console.log(jenisHarta);

	const kelompokHarta = await db.insert(schema.kelompokHarta).values([
		{ jenis: 'Penyusutan Fiskal', keterangan: 'Kelompok 1' },
		{ jenis: 'Penyusutan Fiskal', keterangan: 'Kelompok 2' },
		{ jenis: 'Penyusutan Fiskal', keterangan: 'Kelompok 3' },
		{ jenis: 'Penyusutan Fiskal', keterangan: 'Kelompok 4' },
		{ jenis: 'Penyusutan Fiskal', keterangan: 'Permanen' },
		{ jenis: 'Penyusutan Fiskal', keterangan: 'Tidak Permanen' }

		// { kode: 1, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok 1' },
		// { kode: 2, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok 2' },
		// { kode: 3, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok 3' },
		// { kode: 4, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok 4' },
		// { kode: 5, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok Lain-Lain' }
	]);
	console.log(kelompokHarta);

	const metodePenyusutanFiskal = await db
		.insert(schema.metodePenyusutanFiskal)
		.values([{ keterangan: 'GL - Garis Lurus' }, { keterangan: 'SM - Saldo Menurun' }])
		.onConflictDoNothing();

	console.log(metodePenyusutanFiskal);

	const metodePenyusutanKomersial = await db
		.insert(schema.metodePenyusutanKomersial)
		.values([
			{ keterangan: 'GL - Garis Lurus' },
			{ keterangan: 'JAT - Jumlah Angka Tahun' },
			{ keterangan: 'SM - Saldo Menurun' },
			{ keterangan: 'SMG - Saldo Menurun Ganda' },
			{ keterangan: 'JJJ - Jumlah Jam Jasa' },
			{ keterangan: 'JSP - Jumlah Satuan Produksi' },
			{ keterangan: 'ML - Metode Lainnya' }
		])
		.onConflictDoNothing();
	console.log(metodePenyusutanKomersial);

	const user = await authClient.signUp.email({
		name: 'Admin',
		email: 'admin@laros.ae',
		username: 'admin',
		displayUsername: 'admin',
		password: 'Larosndo12..'
	});
	console.log(user);
}

main();
