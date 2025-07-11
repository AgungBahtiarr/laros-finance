<script lang="ts">
	import { ArrowUp, ArrowDown, Calendar, Clipboard, DollarSign, BarChart } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	function formatRupiah(amount: number) {
		if (amount >= 1000000000) {
			return `Rp ${(amount / 1000000000).toFixed(1)}B`;
		} else if (amount >= 1000000) {
			return `Rp ${(amount / 1000000).toFixed(1)}M`;
		} else if (amount >= 1000) {
			return `Rp ${(amount / 1000).toFixed(1)}K`;
		}
		return `Rp ${amount.toLocaleString('id-ID')}`;
	}

	const now = new Date();
	const monthNames = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];
	const currentMonth = monthNames[now.getMonth()];
	const currentYear = now.getFullYear();

	function getColorForIndex(index: number) {
		const colors = [
			'rgba(244, 127, 32, 0.8)',
			'rgba(73, 138, 201, 0.8)',
			'rgba(92, 184, 92, 0.7)',
			'rgba(240, 173, 78, 0.7)',
			'rgba(91, 192, 222, 0.7)',
			'rgba(217, 83, 79, 0.7)',
			'rgba(150, 117, 206, 0.7)'
		];
		return colors[index % colors.length];
	}

	onMount(() => {
		if (
			typeof window !== 'undefined' &&
			window.Chart &&
			data.chartData &&
			data.chartData.length > 0
		) {
			const ctx = document.getElementById('assetDistribution');
			if (!ctx) return;

			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
			script.onload = () => {
				const chart = new Chart(ctx, {
					type: 'doughnut',
					data: {
						labels: data.chartData.map((item) => item.name),
						datasets: [
							{
								data: data.chartData.map((item) => item.count),
								backgroundColor: data.chartData.map((_, i) => getColorForIndex(i)),
								borderWidth: 1
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								display: false
							}
						}
					}
				});
			};
			document.head.appendChild(script);
		}
	});
</script>

<div class="space-y-6">
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<!-- Card 1: Total Aset -->
		<div class="bg-base-100 rounded-lg border p-6">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 rounded-full p-3">
					<Clipboard class="text-primary h-5 w-5" />
				</div>
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Aset</div>
			</div>
			<div class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
				{data.stats.totalAssets}
			</div>
			<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{currentMonth} {currentYear}</div>
		</div>

		<!-- Card 2: Nilai Total Aset -->
		<div class="bg-base-100 rounded-lg border p-6">
			<div class="flex items-center gap-3">
				<div class="bg-secondary/10 rounded-full p-3">
					<DollarSign class="text-secondary h-5 w-5" />
				</div>
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Nilai Total Aset</div>
			</div>
			<div class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
				{formatRupiah(data.stats.totalAssetValue)}
			</div>
			<div class="mt-1 flex items-center gap-1 text-xs">
				{#if data.stats.yoyGrowth > 0}
					<ArrowUp class="text-success h-3 w-3" />
					<span class="text-success">{data.stats.yoyGrowth}% dari tahun sebelumnya</span>
				{:else if data.stats.yoyGrowth < 0}
					<ArrowDown class="text-error h-3 w-3" />
					<span class="text-error">{Math.abs(data.stats.yoyGrowth)}% dari tahun sebelumnya</span>
				{:else}
					<span class="text-gray-500 dark:text-gray-400"
						>Tidak ada perubahan dari tahun sebelumnya</span
					>
				{/if}
			</div>
		</div>

		<!-- Card 3: Nilai Sisa Buku -->
		<div class="bg-base-100 rounded-lg border p-6">
			<div class="flex items-center gap-3">
				<div class="bg-success/10 rounded-full p-3">
					<DollarSign class="text-success h-5 w-5" />
				</div>
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Nilai Sisa Buku</div>
			</div>
			<div class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
				{formatRupiah(data.stats.totalBookValue)}
			</div>
			<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				{((data.stats.totalBookValue / data.stats.totalAssetValue) * 100).toFixed(1)}% dari nilai
				total
			</div>
		</div>

		<!-- Card 4: Total Penyusutan -->
		<div class="bg-base-100 rounded-lg border p-6">
			<div class="flex items-center gap-3">
				<div class="bg-warning/10 rounded-full p-3">
					<ArrowDown class="text-warning h-5 w-5" />
				</div>
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Penyusutan</div>
			</div>
			<div class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
				{formatRupiah(data.stats.totalDepreciation)}
			</div>
			<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				{((data.stats.totalDepreciation / data.stats.totalAssetValue) * 100).toFixed(1)}% dari nilai
				total
			</div>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
		<!-- Chart Distribusi Aset -->
		<div class="bg-base-100 col-span-4 rounded-lg border">
			<div class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white">Distribusi Aset</h3>
					<div class="badge badge-outline">
						{data.stats.totalAssets} total
					</div>
				</div>

				{#if data.chartData && data.chartData.length > 0}
					<div class="flex h-64 items-center justify-center">
						<div class="relative h-full w-full">
							<canvas id="assetDistribution"></canvas>
						</div>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-2">
						{#each data.chartData as item, i}
							<div class="flex items-center gap-2">
								<div class="h-3 w-3" style="background-color: {getColorForIndex(i)}"></div>
								<span class="text-sm text-gray-700 dark:text-gray-300"
									>{item.name} ({item.count})</span
								>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex h-64 items-center justify-center">
						<div class="text-center text-gray-500 dark:text-gray-400">
							<BarChart class="mx-auto h-12 w-12 opacity-20" />
							<p class="mt-2">Belum ada data aset</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Aset Terbaru -->
		<div class="bg-base-100 col-span-3 rounded-lg border">
			<div class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white">Aset Terbaru</h3>
					<a href="/assets" class="text-primary text-sm hover:underline">Lihat semua</a>
				</div>

				{#if data.recentAssets && data.recentAssets.length > 0}
					<div class="space-y-4">
						{#each data.recentAssets as asset}
							<div class="flex items-center gap-3 rounded-lg border p-3">
								<div class="bg-primary/10 rounded-lg p-2">
									<Calendar class="text-primary h-5 w-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-gray-800 dark:text-gray-200">
										{asset.namaHarta}
									</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">
										{asset.jenisHarta.keterangan} - {asset.kelompokHarta.keterangan}
									</p>
								</div>
								<div class="text-right">
									<div class="font-medium text-gray-800 dark:text-gray-200">
										{formatRupiah(asset.hargaPerolehan)}
									</div>
									<div class="text-xs text-gray-500 dark:text-gray-400">
										{asset.bulanPerolehan}/{asset.tahunPerolehan}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex h-64 items-center justify-center">
						<div class="text-center text-gray-500 dark:text-gray-400">
							<Clipboard class="mx-auto h-12 w-12 opacity-20" />
							<p class="mt-2">Belum ada data aset</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
