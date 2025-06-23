import { db } from '$lib/server/db';
import { asset } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
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

export const load: PageServerLoad = async ({ params }) => {
	const assetId = parseInt(params.id);

	if (isNaN(assetId)) {
		throw error(400, 'Invalid asset ID');
	}

	const assetData = await db.query.asset.findFirst({
		where: eq(asset.id, assetId),
		with: {
			jenisHarta: true,
			kelompokHarta: true,
			metodePenyusutanKomersial: true,
			metodePenyusutanFiskal: true
		}
	});

	if (!assetData) {
		throw error(404, 'Asset not found');
	}

	// Get master data for dropdowns
	const masterData = {
		jenisHarta: await db.query.jenisHarta.findMany(),
		kelompokHarta: await db.query.kelompokHarta.findMany(),
		metodePenyusutanKomersial: await db.query.metodePenyusutanKomersial.findMany(),
		metodePenyusutanFiskal: await db.query.metodePenyusutanFiskal.findMany()
	};

	return {
		asset: assetData,
		masterData
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const assetId = parseInt(params.id);

		if (isNaN(assetId)) {
			return fail(400, { error: 'Invalid asset ID' });
		}

		const formData = await request.formData();
		const imageFile = formData.get('image') as File;
		let imageUrl: string | null = null;

		try {
			// Handle image upload if a new file is provided
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

			// Prepare update data
			const updateData: any = {
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
				keterangan: formData.get('keterangan') as string,
				lokasi: formData.get('lokasi') as string,
				kode: formData.get('kode') as string,
				updatedAt: new Date()
			};

			// Only update image URL if a new image was uploaded
			if (imageUrl) {
				updateData.imageUrl = imageUrl;
			}

			await db.update(asset).set(updateData).where(eq(asset.id, assetId));

			throw redirect(303, `/assets/${assetId}`);
		} catch (error) {
			if (error instanceof Response) throw error;

			console.error('Error updating asset:', error);
			return fail(500, {
				error: 'Gagal mengupdate asset',
				values: Object.fromEntries(formData)
			});
		}
	}
};
