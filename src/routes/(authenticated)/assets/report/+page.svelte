<script lang="ts">
	import { goto } from '$app/navigation';
	import { FileDown, FileSpreadsheet, Filter, RefreshCw } from '@lucide/svelte';

	let { data } = $props();

	// Form state
	let jenisHartaId = $state(data.filters.jenisHartaId);
	let kelompokHartaId = $state(data.filters.kelompokHartaId);
	let tahunPerolehan = $state(data.filters.tahunPerolehan);
	let searchTerm = $state(data.filters.search);
	let startDate = $state(data.filters.startDate);
	let endDate = $state(data.filters.endDate);

	// Toggle filter visibility
	let showFilters = $state(false);

	// Total calculations
	let totalAssets = $derived(data.assets.length);
	let totalHargaPerolehan = $derived(
		data.assets.reduce((sum, asset) => sum + asset.hargaPerolehan, 0)
	);
	let totalNilaiSisaBuku = $derived(
		data.assets.reduce((sum, asset) => sum + asset.nilaiSisaBuku, 0)
	);
	let totalPenyusutan = $derived(
		data.assets.reduce((sum, asset) => sum + asset.penyusutanFiskalTahunIni, 0)
	);

	// Format currency
	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Apply filters
	function applyFilters() {
		const searchParams = new URLSearchParams();

		if (jenisHartaId) searchParams.set('jenisHartaId', jenisHartaId);
		if (kelompokHartaId) searchParams.set('kelompokHartaId', kelompokHartaId);
		if (tahunPerolehan) searchParams.set('tahunPerolehan', tahunPerolehan);
		if (searchTerm) searchParams.set('search', searchTerm);
		if (startDate) searchParams.set('startDate', startDate);
		if (endDate) searchParams.set('endDate', endDate);

		goto(`?${searchParams.toString()}`);
	}

	// Reset filters
	function resetFilters() {
		jenisHartaId = '';
		kelompokHartaId = '';
		tahunPerolehan = '';
		searchTerm = '';
		startDate = '';
		endDate = '';

		goto('/assets/report');
	}

	// Export to CSV
	function exportToCSV() {
		// Create CSV header following the specific format
		const header = [
			'Jenis Harta',
			'Kelompok Harta',
			'Jenis Usaha',
			'Nama Harta',
			'Bln Perolehan',
			'Thn Perolehan',
			'Jenis Penyusutan Komersial',
			'Jenis Penyusutan Fiskal',
			'Harga Perolehan',
			'Nilai Sisa Buku',
			'Penyusutan fiskal tahun ini',
			'Keterangan nama harta'
		];

		// Convert assets to CSV rows with the exact format requested
		const csvRows = [header];

		data.assets.forEach((asset) => {
			const row = [
				asset.jenisHartaId.toString(), // Using ID instead of keterangan as per format
				asset.kelompokHartaId.toString(), // Using ID instead of keterangan
				asset.jenisUsaha,
				asset.namaHarta,
				asset.bulanPerolehan.toString(),
				asset.tahunPerolehan.toString(),
				asset.metodePenyusutanKomersialId.toString(), // Using ID
				asset.metodePenyusutanFiskalId.toString(), // Using ID
				asset.hargaPerolehan.toString(),
				asset.nilaiSisaBuku.toString(),
				asset.penyusutanFiskalTahunIni.toString(),
				asset.keterangan || ''
			];
			csvRows.push(row);
		});

		// Using tab as separator for compatibility with Excel
		const csvContent = csvRows
			.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join('\t'))
			.join('\n');

		// Create blob and download
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		// Create filename with current date
		const now = new Date();
		const filename = `laporan_aset_${now.getFullYear()}-${(now.getMonth() + 1)
			.toString()
			.padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.csv`;

		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Print report
	function printReport() {
		window.print();
	}
</script>

<div class="space-y-6 print:space-y-4" id="report-container">
	<!-- Header -->
	<div class="flex flex-col justify-between gap-4 sm:flex-row print:flex-row">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 print:text-xl">Laporan Aset</h1>
			<p class="text-sm text-gray-500">
				{totalAssets} aset
				{#if data.filters.jenisHartaId || data.filters.kelompokHartaId || data.filters.tahunPerolehan || data.filters.search || data.filters.startDate || data.filters.endDate}
					(dengan filter)
				{/if}
			</p>
		</div>
		<div class="flex gap-2 print:hidden">
			<button class="btn btn-outline btn-sm gap-1" onclick={() => (showFilters = !showFilters)}>
				<Filter class="h-4 w-4" />
				{showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
			</button>
			<button class="btn btn-outline btn-sm gap-1" onclick={printReport}>
				<FileSpreadsheet class="h-4 w-4" />
				Cetak
			</button>
			<button class="btn btn-primary btn-sm gap-1" onclick={exportToCSV}>
				<FileDown class="h-4 w-4" />
				Export CSV
			</button>
		</div>
	</div>

	<!-- Filter Section -->
	{#if showFilters}
		<div class="card bg-base-100 border print:hidden">
			<div class="card-body p-4">
				<h2 class="card-title text-lg">Filter Laporan</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
					<div class="form-control w-full">
						<label class="label" for="jenisHartaId">
							<span class="label-text">Jenis Harta</span>
						</label>
						<select
							id="jenisHartaId"
							class="select select-bordered w-full"
							bind:value={jenisHartaId}
						>
							<option value="">Semua Jenis Harta</option>
							{#each data.masterData.jenisHarta as jenis}
								<option value={jenis.id}>{jenis.keterangan}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="kelompokHartaId">
							<span class="label-text">Kelompok Harta</span>
						</label>
						<select
							id="kelompokHartaId"
							class="select select-bordered w-full"
							bind:value={kelompokHartaId}
						>
							<option value="">Semua Kelompok Harta</option>
							{#each data.masterData.kelompokHarta as kelompok}
								<option value={kelompok.id}>{kelompok.keterangan}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="tahunPerolehan">
							<span class="label-text">Tahun Perolehan</span>
						</label>
						<select
							id="tahunPerolehan"
							class="select select-bordered w-full"
							bind:value={tahunPerolehan}
						>
							<option value="">Semua Tahun</option>
							{#each data.years as year}
								<option value={year}>{year}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="searchTerm">
							<span class="label-text">Pencarian</span>
						</label>
						<input
							type="text"
							id="searchTerm"
							class="input input-bordered w-full"
							placeholder="Nama aset..."
							bind:value={searchTerm}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="startDate">
							<span class="label-text">Tanggal Mulai</span>
						</label>
						<input
							type="month"
							id="startDate"
							class="input input-bordered w-full"
							bind:value={startDate}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="endDate">
							<span class="label-text">Tanggal Akhir</span>
						</label>
						<input
							type="month"
							id="endDate"
							class="input input-bordered w-full"
							bind:value={endDate}
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button class="btn btn-outline btn-sm gap-1" onclick={resetFilters}>
						<RefreshCw class="h-4 w-4" />
						Reset
					</button>
					<button class="btn btn-primary btn-sm" onclick={applyFilters}>Terapkan Filter</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
		<div class="card bg-base-100 border p-4">
			<div class="text-sm font-medium text-gray-500">Total Harga Perolehan</div>
			<div class="mt-1 text-xl font-bold text-gray-900">{formatRupiah(totalHargaPerolehan)}</div>
		</div>
		<div class="card bg-base-100 border p-4">
			<div class="text-sm font-medium text-gray-500">Total Nilai Sisa Buku</div>
			<div class="mt-1 text-xl font-bold text-gray-900">{formatRupiah(totalNilaiSisaBuku)}</div>
		</div>
		<div class="card bg-base-100 border p-4">
			<div class="text-sm font-medium text-gray-500">Total Penyusutan Fiskal</div>
			<div class="mt-1 text-xl font-bold text-gray-900">{formatRupiah(totalPenyusutan)}</div>
		</div>
	</div>

	<!-- Assets Table -->
	<div class="card bg-base-100 border">
		<div class="overflow-x-auto">
			<table class="table-sm table-zebra table">
				<thead class="bg-base-200 text-xs">
					<tr>
						<th class="w-10">No</th>
						<th>Kode/Nama</th>
						<th>Jenis</th>
						<th>Kelompok</th>
						<th>Perolehan</th>
						<th class="text-right">Harga Perolehan</th>
						<th class="text-right">Nilai Sisa Buku</th>
						<th class="text-right">Penyusutan</th>
					</tr>
				</thead>
				<tbody>
					{#each data.assets as asset, i}
						<tr>
							<td>{i + 1}</td>
							<td>
								<div class="font-medium">{asset.namaHarta}</div>
								<div class="text-xs text-gray-500">{asset.kode || asset.jenisUsaha}</div>
							</td>
							<td>{asset.jenisHarta.keterangan}</td>
							<td>{asset.kelompokHarta.keterangan}</td>
							<td>{asset.bulanPerolehan}/{asset.tahunPerolehan}</td>
							<td class="text-right tabular-nums">{formatRupiah(asset.hargaPerolehan)}</td>
							<td class="text-right tabular-nums">{formatRupiah(asset.nilaiSisaBuku)}</td>
							<td class="text-right tabular-nums">
								{formatRupiah(asset.penyusutanFiskalTahunIni)}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="8" class="py-8 text-center">
								<div class="text-gray-500">
									{data.filters.jenisHartaId ||
									data.filters.kelompokHartaId ||
									data.filters.tahunPerolehan ||
									data.filters.search
										? 'Tidak ada aset yang sesuai dengan filter'
										: 'Belum ada data aset'}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
				<!-- Footer with totals -->
				{#if data.assets.length > 0}
					<tfoot class="bg-base-200 font-semibold">
						<tr>
							<td colspan="5" class="text-right">Total</td>
							<td class="text-right tabular-nums">{formatRupiah(totalHargaPerolehan)}</td>
							<td class="text-right tabular-nums">{formatRupiah(totalNilaiSisaBuku)}</td>
							<td class="text-right tabular-nums">{formatRupiah(totalPenyusutan)}</td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>
	</div>

	<!-- Print footer -->
	<div class="hidden print:mt-8 print:block">
		<div class="text-sm">
			<p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
			<p>
				Laporan ini berisi {totalAssets} aset dengan total nilai perolehan {formatRupiah(
					totalHargaPerolehan
				)}
			</p>
		</div>
	</div>
</div>

