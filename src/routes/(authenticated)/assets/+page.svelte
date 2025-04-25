<script lang="ts">
	import { onMount } from 'svelte';
	let assets = $state([]);
	let loading = $state(true);
	let error = $state(null);

	async function fetchAssets() {
		try {
			const response = await fetch('/api/assets');
			if (!response.ok) throw new Error('Gagal mengambil data');
			assets = await response.json();
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	onMount(fetchAssets);

	async function deleteAsset(id) {
		if (!confirm('Apakah Anda yakin ingin menghapus aset ini?')) return;

		try {
			const response = await fetch(`/api/assets/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) throw new Error('Gagal menghapus aset');

			assets = assets.filter((asset) => asset.id !== id);
		} catch (err) {
			error = err.message;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-medium text-gray-900">Daftar Aset</h2>
			<p class="mt-1 text-sm text-gray-500">Kelola semua aset perusahaan di sini</p>
		</div>
		<a href="/assets/add" class="btn btn-primary btn-sm normal-case">
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
		</a>
	</div>

	<div class="rounded-lg border bg-white">
		{#if loading}
			<div class="flex justify-center p-12">
				<span class="loading loading-spinner loading-md text-primary"></span>
			</div>
		{:else if error}
			<div class="p-6">
				<div class="alert alert-error text-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>{error}</span>
				</div>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table-zebra table">
					<!-- ... konten tabel ... -->
				</table>
			</div>
		{/if}
	</div>
</div>
