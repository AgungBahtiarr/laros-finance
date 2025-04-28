import { db } from '$lib/server/db';
import { asset } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

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

	return {
		asset: assetData
	};
};