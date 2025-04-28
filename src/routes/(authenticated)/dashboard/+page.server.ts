import { db } from '$lib/server/db';
import { asset } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';
import { count, sum } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Get count of all assets
	const assetCountResult = await db
		.select({ count: count() })
		.from(asset);
		
	const totalAssets = assetCountResult[0]?.count || 0;

	// Get sum of hargaPerolehan (total asset value)
	const assetValueResult = await db
		.select({ total: sum(asset.hargaPerolehan) })
		.from(asset);
		
	const totalAssetValue = assetValueResult[0]?.total || 0;
	
	// Get sum of penyusutanFiskalTahunIni (total depreciation)
	const depreciationResult = await db
		.select({ total: sum(asset.penyusutanFiskalTahunIni) })
		.from(asset);
		
	const totalDepreciation = depreciationResult[0]?.total || 0;
	
	// Get sum of nilaiSisaBuku (book value)
	const bookValueResult = await db
		.select({ total: sum(asset.nilaiSisaBuku) })
		.from(asset);
		
	const totalBookValue = bookValueResult[0]?.total || 0;
	
	// Get the 5 most recently added assets
	const recentAssets = await db.query.asset.findMany({
		limit: 5,
		orderBy: (asset, { desc }) => [desc(asset.createdAt)],
		with: {
			jenisHarta: true,
			kelompokHarta: true
		}
	});
	
	// Get assets per jenis harta for chart data
	const assetsByType = await db
		.select({
			jenisHartaId: asset.jenisHartaId,
			count: count()
		})
		.from(asset)
		.groupBy(asset.jenisHartaId);
		
	// Enrich with jenisHarta names
	const jenisHartaList = await db.query.jenisHarta.findMany();
	const jenisHartaMap = new Map(jenisHartaList.map(j => [j.id, j.keterangan]));
	
	const chartData = assetsByType.map(item => ({
		id: item.jenisHartaId,
		name: jenisHartaMap.get(item.jenisHartaId) || `Jenis ${item.jenisHartaId}`,
		count: item.count
	}));
	
	// Calculate year over year growth (mocked since we don't have historical data)
	// For a real implementation, we would need to compare with previous period
	const yoyGrowth = totalAssets > 0 ? Math.round((totalAssets / 10 - 1) * 100) : 0;
	
	return {
		stats: {
			totalAssets,
			totalAssetValue,
			totalDepreciation,
			totalBookValue,
			yoyGrowth
		},
		recentAssets,
		chartData
	};
};