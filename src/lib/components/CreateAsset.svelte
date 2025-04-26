<script lang="ts">
	import { enhance } from '$app/forms';

	let { masterData } = $props();
	let form;

	// State untuk nilai currency
	let hargaPerolehan = $state('');
	let nilaiSisaBuku = $state('');
	let penyusutanFiskalTahunIni = $state('');

	// Format number to IDR
	function formatRupiah(number: string) {
		const numericValue = number.replace(/\D/g, '');
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(Number(numericValue));
	}

	// Handle currency input change
	function handleCurrencyInput(event: Event, binding: string) {
		const input = event.target as HTMLInputElement;
		const numericValue = input.value.replace(/\D/g, '');

		// Update the displayed value
		input.value = formatRupiah(numericValue);

		// Update the bound state
		switch (binding) {
			case 'hargaPerolehan':
				hargaPerolehan = numericValue;
				break;
			case 'nilaiSisaBuku':
				nilaiSisaBuku = numericValue;
				break;
			case 'penyusutanFiskalTahunIni':
				penyusutanFiskalTahunIni = numericValue;
				break;
		}
	}

	$effect(() => {
		if (form) form.reset();
		hargaPerolehan = '';
		nilaiSisaBuku = '';
		penyusutanFiskalTahunIni = '';
	});

	function handleSubmit() {
		return async ({ result }) => {
			if (result.type === 'success') {
				document.getElementById('createAsset').close();
				window.location.reload();
			}
		};
	}
</script>

<dialog id="createAsset" class="modal">
	<div class="modal-box w-11/12 max-w-5xl p-0">
		<!-- Header -->
		<div class="border-b p-4">
			<h3 class="text-lg font-bold">Tambah Asset</h3>
		</div>

		<!-- Form -->
		<div class="p-4">
			<form bind:this={form} method="POST" action="?/create" use:enhance={handleSubmit}>
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<!-- Kolom Kiri -->
					<div class="space-y-4">
						<div class="form-control w-full">
							<label class="label" for="namaHarta">
								<span class="label-text">Nama Harta</span>
							</label>
							<input
								id="namaHarta"
								type="text"
								name="namaHarta"
								class="input input-bordered w-full"
								required
							/>
						</div>

						<div class="form-control w-full">
							<label class="label" for="jenisUsaha">
								<span class="label-text">Jenis Usaha</span>
							</label>
							<input
								id="jenisUsaha"
								type="text"
								name="jenisUsaha"
								class="input input-bordered w-full"
								required
							/>
						</div>

						<div class="form-control w-full">
							<label class="label" for="jenisHartaId">
								<span class="label-text">Jenis Harta</span>
							</label>
							<select
								id="jenisHartaId"
								name="jenisHartaId"
								class="select select-bordered w-full"
								required
							>
								<option value="">Pilih Jenis Harta</option>
								{#each masterData.jenisHarta as jenis}
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
								name="kelompokHartaId"
								class="select select-bordered w-full"
								required
							>
								<option value="">Pilih Kelompok Harta</option>
								{#each masterData.kelompokHarta as kelompok}
									<option value={kelompok.id}>{kelompok.keterangan}</option>
								{/each}
							</select>
						</div>

						<div class="form-control w-full">
							<label class="label" for="metodePenyusutanKomersialId">
								<span class="label-text">Metode Penyusutan Komersial</span>
							</label>
							<select
								id="metodePenyusutanKomersialId"
								name="metodePenyusutanKomersialId"
								class="select select-bordered w-full"
								required
							>
								<option value="">Pilih Metode</option>
								{#each masterData.metodePenyusutanKomersial as metode}
									<option value={metode.id}>{metode.keterangan}</option>
								{/each}
							</select>
						</div>
					</div>

					<!-- Kolom Kanan -->
					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div class="form-control w-full">
								<label class="label" for="bulanPerolehan">
									<span class="label-text">Bulan Perolehan</span>
								</label>
								<input
									id="bulanPerolehan"
									type="number"
									name="bulanPerolehan"
									class="input input-bordered w-full"
									min="1"
									max="12"
									required
								/>
							</div>
							<div class="form-control w-full">
								<label class="label" for="tahunPerolehan">
									<span class="label-text">Tahun Perolehan</span>
								</label>
								<input
									id="tahunPerolehan"
									type="number"
									name="tahunPerolehan"
									class="input input-bordered w-full"
									min="1900"
									required
								/>
							</div>
						</div>

						<div class="form-control w-full">
							<label class="label" for="metodePenyusutanFiskalId">
								<span class="label-text">Metode Penyusutan Fiskal</span>
							</label>
							<select
								id="metodePenyusutanFiskalId"
								name="metodePenyusutanFiskalId"
								class="select select-bordered w-full"
								required
							>
								<option value="">Pilih Metode</option>
								{#each masterData.metodePenyusutanFiskal as metode}
									<option value={metode.id}>{metode.keterangan}</option>
								{/each}
							</select>
						</div>

						<div class="form-control w-full">
							<label class="label" for="hargaPerolehan">
								<span class="label-text">Harga Perolehan</span>
							</label>
							<input
								id="hargaPerolehan"
								type="text"
								class="input input-bordered w-full"
								oninput={(e) => handleCurrencyInput(e, 'hargaPerolehan')}
								required
							/>
							<input type="hidden" name="hargaPerolehan" value={hargaPerolehan} />
						</div>

						<div class="form-control w-full">
							<label class="label" for="nilaiSisaBuku">
								<span class="label-text">Nilai Sisa Buku</span>
							</label>
							<input
								id="nilaiSisaBuku"
								type="text"
								class="input input-bordered w-full"
								oninput={(e) => handleCurrencyInput(e, 'nilaiSisaBuku')}
								required
							/>
							<input type="hidden" name="nilaiSisaBuku" value={nilaiSisaBuku} />
						</div>

						<div class="form-control w-full">
							<label class="label" for="penyusutanFiskalTahunIni">
								<span class="label-text">Penyusutan Fiskal Tahun Ini</span>
							</label>
							<input
								id="penyusutanFiskalTahunIni"
								type="text"
								class="input input-bordered w-full"
								oninput={(e) => handleCurrencyInput(e, 'penyusutanFiskalTahunIni')}
								required
							/>
							<input
								type="hidden"
								name="penyusutanFiskalTahunIni"
								value={penyusutanFiskalTahunIni}
							/>
						</div>
					</div>
				</div>

				<div class="form-control mt-4 w-full">
					<label class="label" for="keterangan">
						<span class="label-text">Keterangan</span>
					</label>
					<textarea
						id="keterangan"
						name="keterangan"
						class="textarea textarea-bordered w-full"
						rows="3"
					></textarea>
				</div>

				<!-- Footer -->
				<div class="modal-action mt-6 border-t p-4">
					<button type="submit" class="btn btn-primary">Simpan</button>
					<button
						type="button"
						class="btn"
						onclick={() => document.getElementById('createAsset').close()}
					>
						Batal
					</button>
				</div>
			</form>
		</div>
	</div>
</dialog>
