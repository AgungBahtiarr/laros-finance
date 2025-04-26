import { db } from '$lib/server/db';
import { asset } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const assets = await db.query.asset.findMany({
		with: {
			jenisHarta: true,
			kelompokHarta: true,
			metodePenyusutanKomersial: true,
			metodePenyusutanFiskal: true
		}
	});

	const masterData = {
		jenisHarta: await db.query.jenisHarta.findMany(),
		kelompokHarta: await db.query.kelompokHarta.findMany(),
		metodePenyusutanKomersial: await db.query.metodePenyusutanKomersial.findMany(),
		metodePenyusutanFiskal: await db.query.metodePenyusutanFiskal.findMany()
	};

	return {
		assets,
		masterData
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();

		try {
			await db.insert(asset).values({
				jenisHartaId: parseInt(formData.get('jenisHartaId') as string),
				kelompokHartaId: parseInt(formData.get('kelompokHartaId') as string),
				jenisUsaha: formData.get('jenisUsaha') as string,
				namaHarta: formData.get('namaHarta') as string,
				bulanPerolehan: parseInt(formData.get('bulanPerolehan') as string),
				tahunPerolehan: parseInt(formData.get('tahunPerolehan') as string),
				metodePenyusutanKomersialId: parseInt(
					formData.get('metodePenyusutanKomersialId') as string
				),
				metodePenyusutanFiskalId: parseInt(formData.get('metodePenyusutanFiskalId') as string),
				hargaPerolehan: parseInt(formData.get('hargaPerolehan') as string),
				nilaiSisaBuku: parseInt(formData.get('nilaiSisaBuku') as string),
				penyusutanFiskalTahunIni: parseInt(formData.get('penyusutanFiskalTahunIni') as string),
				keterangan: formData.get('keterangan') as string
			});

			return { success: true };
		} catch (error) {
			console.error('Error creating asset:', error);
			return fail(500, {
				error: 'Gagal menambahkan asset',
				values: Object.fromEntries(formData)
			});
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);

		try {
			await db.delete(asset).where(eq(asset.id, id));
			return { success: true };
		} catch (error) {
			console.error('Error deleting asset:', error);
			return fail(500, { error: 'Gagal menghapus asset' });
		}
	}
};
