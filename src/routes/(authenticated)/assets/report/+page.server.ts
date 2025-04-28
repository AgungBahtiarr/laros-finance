import { db } from '$lib/server/db';
import { asset } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';
import { eq, and, gte, lte, like } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url }) => {
	// Get filter parameters from URL
	const jenisHartaId = url.searchParams.get('jenisHartaId');
	const kelompokHartaId = url.searchParams.get('kelompokHartaId');
	const tahunPerolehan = url.searchParams.get('tahunPerolehan');
	const searchTerm = url.searchParams.get('search');
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');

	// Build filter conditions
	let conditions = [];

	if (jenisHartaId && jenisHartaId !== '') {
		conditions.push(eq(asset.jenisHartaId, parseInt(jenisHartaId)));
	}

	if (kelompokHartaId && kelompokHartaId !== '') {
		conditions.push(eq(asset.kelompokHartaId, parseInt(kelompokHartaId)));
	}

	if (tahunPerolehan && tahunPerolehan !== '') {
		conditions.push(eq(asset.tahunPerolehan, parseInt(tahunPerolehan)));
	}

	if (searchTerm && searchTerm !== '') {
		conditions.push(like(asset.namaHarta, `%${searchTerm}%`));
	}

	// Handle date range filtering based on acquisition date
	if (startDate && startDate !== '') {
		const [startYear, startMonth] = startDate.split('-').map(Number);
		
		// Convert to numeric format for comparison (year * 100 + month)
		const startNumeric = startYear * 100 + startMonth;
		
		conditions.push(
			gte(
				asset.tahunPerolehan * 100 + asset.bulanPerolehan,
				startNumeric
			)
		);
	}

	if (endDate && endDate !== '') {
		const [endYear, endMonth] = endDate.split('-').map(Number);
		
		// Convert to numeric format for comparison (year * 100 + month)
		const endNumeric = endYear * 100 + endMonth;
		
		conditions.push(
			lte(
				asset.tahunPerolehan * 100 + asset.bulanPerolehan,
				endNumeric
			)
		);
	}

	// Fetch assets with filters
	const assets = await db.query.asset.findMany({
		where: conditions.length > 0 ? and(...conditions) : undefined,
		with: {
			jenisHarta: true,
			kelompokHarta: true,
			metodePenyusutanKomersial: true,
			metodePenyusutanFiskal: true
		}
	});

	// Fetch master data for filters
	const masterData = {
		jenisHarta: await db.query.jenisHarta.findMany(),
		kelompokHarta: await db.query.kelompokHarta.findMany()
	};

	// Get unique years for the year filter
	const years = [...new Set(assets.map((asset) => asset.tahunPerolehan))].sort((a, b) => b - a);

	return {
		assets,
		masterData,
		years,
		filters: {
			jenisHartaId: jenisHartaId || '',
			kelompokHartaId: kelompokHartaId || '',
			tahunPerolehan: tahunPerolehan || '',
			search: searchTerm || '',
			startDate: startDate || '',
			endDate: endDate || ''
		}
	};
};