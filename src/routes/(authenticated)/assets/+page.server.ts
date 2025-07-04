import { db } from '$lib/server/db';
import { asset } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from '$env/dynamic/private';

const s3 = new S3Client({
	region: env.AWS_REGION,
	endpoint: env.AWS_ENDPOINT,
	credentials: {
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY
	},
	forcePathStyle: true
});

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

		const qty = parseInt(formData.get('quantity') as string);

		const jenisHartaId = parseInt(formData.get('jenisHartaId') as string);
		const kelompokHartaId = parseInt(formData.get('kelompokHartaId') as string);
		const jenisUsaha = parseInt(formData.get('jenisUsaha') as string);
		const namaHarta = formData.get('namaHarta') as string;
		const bulanPerolehan = parseInt(formData.get('bulanPerolehan') as string);
		const tahunPerolehan = parseInt(formData.get('tahunPerolehan') as string);
		const metodePenyusutanKomersialId = parseInt(
			formData.get('metodePenyusutanKomersialId') as string
		);

		const metodePenyusutanFiskalId = parseInt(formData.get('metodePenyusutanFiskalId') as string);
		const hargaPerolehan = parseInt(formData.get('hargaPerolehan') as string);
		const nilaiSisaBuku = parseInt(formData.get('nilaiSisaBuku') as string);
		const penyusutanFiskalTahunIni = parseInt(formData.get('penyusutanFiskalTahunIni') as string);
		const keterangan = formData.get('keterangan') as string;
		const lokasi = formData.get('lokasi') as string;
		const kode = formData.get('kode') as string;

		const imageFile = formData.get('image') as File;

		let imageUrl: string | null = null;

		try {
			if (imageFile && imageFile.size > 0) {
				const fileName = `${Date.now()}-${imageFile.name.replace(/\s/g, '_')}`;
				const uploadParams = {
					Bucket: env.S3_BUCKET_NAME,
					Key: fileName,
					Body: imageFile.stream(),
					ContentType: imageFile.type,
					ACL: 'public-read'
				};

				const uploader = new Upload({
					client: s3,
					params: uploadParams
				});

				await uploader.done();
				// Use AWS_URL instead of the result.Location
				imageUrl = env.AWS_URL ? `${env.AWS_URL}${fileName}` : fileName;
			}

			await db.insert(asset).values({
				qty,
				jenisHartaId,
				kelompokHartaId,
				jenisUsaha,
				namaHarta,
				bulanPerolehan,
				tahunPerolehan,
				metodePenyusutanKomersialId,
				metodePenyusutanFiskalId,
				hargaPerolehan,
				nilaiSisaBuku,
				penyusutanFiskalTahunIni,
				keterangan,
				lokasi,
				kode,
				imageUrl
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
