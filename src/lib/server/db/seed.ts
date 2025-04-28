import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { authClient } from '$lib/auth-client-seed';
import 'dotenv/config';

const client = new Database(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });

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

	const kelompokHarta = await db
		.insert(schema.kelompokHarta)
		.values([
			{ kode: 1, jenis: 'Penyusutan Fiskal', keterangan: 'Kelompok 1' },
			{ kode: 2, jenis: 'Penyusutan Fiskal', keterangan: 'Kelompok 2' },
			{ kode: 3, jenis: 'Penyusutan Fiskal', keterangan: 'Kelompok 3' },
			{ kode: 4, jenis: 'Penyusutan Fiskal', keterangan: 'Kelompok 4' }
			// { kode: 5, jenis: 'Penyusutan Fiskal', keterangan: 'Permanen' },
			// { kode: 6, jenis: 'Penyusutan Fiskal', keterangan: 'Tidak Permanen' },

			// { kode: 1, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok 1' },
			// { kode: 2, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok 2' },
			// { kode: 3, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok 3' },
			// { kode: 4, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok 4' },
			// { kode: 5, jenis: 'Amortisasi Fiskal', keterangan: 'Kelompok Lain-Lain' }
		])
		.onConflictDoNothing();
	console.log(kelompokHarta);

	const metodePenyusutanFiskal = await db
		.insert(schema.metodePenyusutanFiskal)
		.values([
			{ kode: 1, keterangan: 'GL - Garis Lurus' },
			{ kode: 2, keterangan: 'SM - Saldo Menurun' }
		])
		.onConflictDoNothing();

	console.log(metodePenyusutanFiskal);

	const metodePenyusutanKomersial = await db
		.insert(schema.metodePenyusutanKomersial)
		.values([
			{ kode: 1, keterangan: 'GL - Garis Lurus' },
			{ kode: 2, keterangan: 'JAT - Jumlah Angka Tahun' },
			{ kode: 3, keterangan: 'SM - Saldo Menurun' },
			{ kode: 4, keterangan: 'SMG - Saldo Menurun Ganda' },
			{ kode: 5, keterangan: 'JJJ - Jumlah Jam Jasa' },
			{ kode: 6, keterangan: 'JSP - Jumlah Satuan Produksi' },
			{ kode: 7, keterangan: 'ML - Metode Lainnya' }
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
