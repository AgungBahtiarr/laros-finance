<script lang="ts">
	import CreateAsset from '$lib/components/CreateAsset.svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Eye, Trash } from '@lucide/svelte';

	let { data } = $props();
	let searchTerm = $state('');
	let selectedJenisHarta = $state('');

	// Filtered assets
	let filteredAssets = $derived(
		data.assets.filter((asset) => {
			const matchSearch =
				asset.namaHarta.toLowerCase().includes(searchTerm.toLowerCase()) ||
				asset.jenisUsaha.toLowerCase().includes(searchTerm.toLowerCase());
			const matchJenis = selectedJenisHarta
				? asset.jenisHartaId === parseInt(selectedJenisHarta)
				: true;
			return matchSearch && matchJenis;
		})
	);

	function handleDelete() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			} else {
				alert('Gagal menghapus asset');
			}
		};
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-medium text-gray-900">Daftar Aset</h2>
			<p class="mt-1 text-sm text-gray-500">Kelola semua aset perusahaan di sini</p>
		</div>

		<button
			class="btn btn-primary btn-sm normal-case"
			onclick={() => document.getElementById('createAsset').showModal()}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mr-2 h-4 w-4"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
					clip-rule="evenodd"
				/>
			</svg>
			Tambah Aset
		</button>
		<CreateAsset masterData={data.masterData} />
	</div>

	<!-- Search and Filter -->
	<div class="flex flex-col gap-4 sm:flex-row">
		<div class="flex-1">
			<input
				type="text"
				placeholder="Cari nama atau jenis usaha..."
				class="input input-bordered w-full"
				bind:value={searchTerm}
			/>
		</div>
		<div class="w-full sm:w-64">
			<select class="select select-bordered w-full" bind:value={selectedJenisHarta}>
				<option value="">Semua Jenis Harta</option>
				{#each data.masterData.jenisHarta as jenis}
					<option value={jenis.id}>{jenis.keterangan}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="rounded-lg border bg-white">
		<div class="overflow-x-auto">
			<table class="table">
				<thead class="bg-base-200">
					<tr>
						<th class="w-10">No</th>
						<th>Nama Harta</th>
						<th>Jenis & Lokasi</th>
						<th>Kelompok</th>
						<th>Tgl Perolehan</th>
						<th>Harga Perolehan</th>
						<th>Nilai Sisa Buku</th>
						<th class="w-28 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredAssets as asset, i}
						<tr class="hover">
							<td class="font-medium">{i + 1}</td>
							<td>
								<div class="font-medium">{asset.namaHarta}</div>
								<div class="text-sm text-gray-500">{asset.jenisUsaha}</div>
							</td>
							<td>{asset.jenisHarta.keterangan}</td>
							<td>{asset.kelompokHarta.keterangan}</td>
							<td>{asset.bulanPerolehan}/{asset.tahunPerolehan}</td>
							<td class="tabular-nums">Rp {asset.hargaPerolehan.toLocaleString()}</td>
							<td class="tabular-nums">Rp {asset.nilaiSisaBuku.toLocaleString()}</td>
							<td>
								<div class="flex gap-1">
									<button
										class="btn btn-ghost btn-sm text-secondary"
										onclick={() => {
											goto(`/assets/${asset.id}`);
										}}
									>
										<Eye />
									</button>
									<form
										method="POST"
										action="?/delete"
										use:enhance={() => {
											if (confirm('Hapus data')) {
												handleDelete;
											} else {
												goto(page.url.pathname, { invalidateAll: true });
											}
										}}
									>
										<input type="hidden" name="id" value={asset.id} />
										<button type="submit" class="btn btn-ghost btn-sm text-error">
											<Trash />
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
					{#if filteredAssets.length === 0}
						<tr>
							<td colspan="8" class="py-8 text-center text-gray-500">
								{searchTerm || selectedJenisHarta
									? 'Tidak ada asset yang sesuai dengan pencarian'
									: 'Belum ada data asset'}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
