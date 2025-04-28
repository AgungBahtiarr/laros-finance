<script lang="ts">
    import { ArrowLeft, MapPin, Pencil, Tag, Calendar, DollarSign, Info } from '@lucide/svelte';
   
	let { data } = $props();
   
	// Function to format numbers as IDR currency
	function formatRupiah(number: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(number);
	}
   
	// Function to safely sanitize and extract iframe src
	function getSafeIframeSrc(iframeString: string): string {
		// Simple regex to extract src attribute from iframe tag
		const srcMatch = iframeString.match(/src=["']([^"']+)["']/i);
		if (srcMatch && srcMatch[1] && srcMatch[1].startsWith('https://www.google.com/maps/embed')) {
			return srcMatch[1];
		}
		return '';
	}
   
	// Check if string is a valid Google Maps iframe
	function isGoogleMapsIframe(str: string): boolean {
		return str.includes('<iframe') && 
			   str.includes('google.com/maps') && 
			   str.includes('</iframe>');
	}
</script>

<div class="space-y-6">
	<!-- Breadcrumb & Actions -->
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<a href="/assets" class="btn btn-ghost btn-sm gap-1">
				<ArrowLeft class="h-4 w-4" />
				<span>Kembali ke Daftar Aset</span>
			</a>
			<h1 class="mt-2 text-2xl font-bold text-gray-900">{data.asset.namaHarta}</h1>
			<p class="text-sm text-gray-500">{data.asset.kode || 'No kode aset'}</p>
		</div>
		
		<div class="flex gap-2">
			<a href={`/assets/${data.asset.id}/edit`} class="btn btn-outline btn-sm gap-1">
				<Pencil class="h-4 w-4" />
				<span>Edit</span>
			</a>
		</div>
	</div>
	
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Left Column - Asset Details -->
		<div class="col-span-2 space-y-6">
			<!-- Basic Information Card -->
			<div class="card bg-base-100 border">
				<div class="card-body">
					<h2 class="card-title text-lg">Informasi Dasar</h2>
					
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<span class="text-sm font-medium text-gray-500">Nama Aset</span>
							<p class="mt-1">{data.asset.namaHarta}</p>
						</div>
						
						<div>
							<span class="text-sm font-medium text-gray-500">Jenis Usaha</span>
							<p class="mt-1">{data.asset.jenisUsaha}</p>
						</div>
						
						<div>
							<span class="text-sm font-medium text-gray-500">Kode Aset</span>
							<p class="mt-1">{data.asset.kode || '-'}</p>
						</div>
						
						<div>
							<span class="text-sm font-medium text-gray-500">Tanggal Perolehan</span>
							<p class="mt-1">{data.asset.bulanPerolehan}/{data.asset.tahunPerolehan}</p>
						</div>
                        
						<div>
							<span class="text-sm font-medium text-gray-500">Jenis Harta</span>
							<p class="mt-1">{data.asset.jenisHarta.keterangan}</p>
						</div>
						
						<div>
							<span class="text-sm font-medium text-gray-500">Kelompok Harta</span>
							<p class="mt-1">{data.asset.kelompokHarta.keterangan}</p>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Financial Information Card -->
			<div class="card bg-base-100 border">
				<div class="card-body">
					<h2 class="card-title text-lg">Informasi Keuangan</h2>
					
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<span class="text-sm font-medium text-gray-500">Harga Perolehan</span>
							<p class="mt-1 text-lg font-semibold">{formatRupiah(data.asset.hargaPerolehan)}</p>
						</div>
						
						<div>
							<span class="text-sm font-medium text-gray-500">Nilai Sisa Buku</span>
							<p class="mt-1 text-lg font-semibold">{formatRupiah(data.asset.nilaiSisaBuku)}</p>
						</div>
						
						<div>
							<span class="text-sm font-medium text-gray-500">Penyusutan Fiskal Tahun Ini</span>
							<p class="mt-1">{formatRupiah(data.asset.penyusutanFiskalTahunIni)}</p>
						</div>
						
						<div>
							<span class="text-sm font-medium text-gray-500">Metode Penyusutan Komersial</span>
							<p class="mt-1">{data.asset.metodePenyusutanKomersial.keterangan}</p>
						</div>
						
						<div>
							<span class="text-sm font-medium text-gray-500">Metode Penyusutan Fiskal</span>
							<p class="mt-1">{data.asset.metodePenyusutanFiskal.keterangan}</p>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Additional Information Card -->
			{#if data.asset.keterangan}
			<div class="card bg-base-100 border">
				<div class="card-body">
					<h2 class="card-title text-lg">Keterangan</h2>
					<p>{data.asset.keterangan}</p>
				</div>
			</div>
			{/if}
		</div>
		
		<!-- Right Column - Location Map -->
		<div class="col-span-1 space-y-6">
			<!-- Location Card -->
			<div class="card bg-base-100 border">
				<div class="card-body">
					<h2 class="card-title text-lg">
						<MapPin class="h-5 w-5 text-primary" />
						Lokasi Aset
					</h2>
					
					{#if data.asset.lokasi && isGoogleMapsIframe(data.asset.lokasi)}
						<!-- Map Container with iframe -->
						<div class="relative h-72 w-full overflow-hidden rounded-lg">
							{@html data.asset.lokasi.replace(/width="[^"]+"/, 'width="100%"')
								.replace(/height="[^"]+"/, 'height="100%"')}
						</div>
					{:else if data.asset.lokasi}
						<p class="mb-2 text-sm overflow-hidden text-ellipsis">{data.asset.lokasi}</p>
						<div class="flex h-72 w-full items-center justify-center rounded-lg bg-gray-100">
							<p class="text-center text-gray-500 px-4">
								Format lokasi tidak valid. Harap masukkan iframe Google Maps.
							</p>
						</div>
					{:else}
						<div class="flex h-72 w-full items-center justify-center rounded-lg bg-gray-100">
							<p class="text-center text-gray-500">Tidak ada data lokasi</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

