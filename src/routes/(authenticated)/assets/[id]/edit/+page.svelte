<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Save } from '@lucide/svelte';

	let { data } = $props();
	let form;

	// State untuk nilai currency
	let hargaPerolehan = $state(data.asset.hargaPerolehan.toString());
	let nilaiSisaBuku = $state(data.asset.nilaiSisaBuku.toString());
	let penyusutanFiskalTahunIni = $state(data.asset.penyusutanFiskalTahunIni.toString());

	// Format number to IDR
	function formatRupiah(number: string | number) {
		const numericValue = number.toString().replace(/\D/g, '');
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

	function validateIframe(event) {
		const textarea = event.target;
		const value = textarea.value.trim();
		const errorDiv = document.getElementById('error-lokasi');

		const iframeRegex = /<iframe.*?>.*?<\/iframe>/i; // regex iframe sederhana

		if (!iframeRegex.test(value)) {
			errorDiv.textContent = 'Masukkan iframe Google Maps yang valid!';
			textarea.classList.add('border-red-500');
		} else {
			errorDiv.textContent = '';
			textarea.classList.remove('border-red-500');
		}
	}

	function handleSubmit() {
		return async ({ result }) => {
			goto(`/assets/${data.asset.id}`, { invalidateAll: true });
		};
	}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<a href={`/assets/${data.asset.id}`} class="btn btn-ghost btn-sm gap-1">
			<ArrowLeft class="h-4 w-4" />
			<span>Kembali</span>
		</a>
		<h1 class="text-2xl font-bold">Edit Asset: {data.asset.namaHarta}</h1>
	</div>

	<div class="card bg-base-100 border">
		<div class="card-body">
			<form method="POST" action="?/update" use:enhance={handleSubmit}>
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
								value={data.asset.namaHarta}
								required
								minlength="3"
								maxlength="255"
								pattern="[A-Za-z0-9\s\-_.]+"
								title="Nama harta hanya boleh mengandung huruf, angka, spasi, tanda hubung, garis bawah, dan titik"
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
								value={data.asset.jenisUsaha}
								required
								minlength="3"
								maxlength="255"
							/>
						</div>

						<div class="form-control w-full">
							<label class="label" for="lokasi">
								<span class="label-text">Lokasi</span>
								<span class="label-text-alt">Masukkan iframe Google Maps</span>
							</label>
							<textarea
								id="lokasi"
								name="lokasi"
								class="textarea textarea-bordered w-full"
								placeholder="Paste iframe Google Maps di sini (<iframe src=...>)"
								rows="3"
								onchange={validateIframe}
								title="Masukkan iframe Google Maps yang valid">{data.asset.lokasi || ''}</textarea
							>
							<div id="error-lokasi" class="mt-2 text-sm text-red-500"></div>
						</div>

						<div class="form-control w-full">
							<label class="label" for="kode">
								<span class="label-text">Kode Aset</span>
							</label>
							<input
								id="kode"
								type="text"
								name="kode"
								class="input input-bordered w-full"
								placeholder="Kode unik aset"
								value={data.asset.kode || ''}
								required
								minlength="5"
								maxlength="100"
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
								{#each data.masterData.jenisHarta as jenis}
									<option value={jenis.id} selected={jenis.id === data.asset.jenisHartaId}>
										{jenis.keterangan}
									</option>
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
								{#each data.masterData.kelompokHarta as kelompok}
									<option value={kelompok.id} selected={kelompok.id === data.asset.kelompokHartaId}>
										{kelompok.keterangan}
									</option>
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
									value={data.asset.bulanPerolehan}
									required
									title="Bulan perolehan harus antara 1-12"
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
									max={new Date().getFullYear()}
									value={data.asset.tahunPerolehan}
									step="1"
									required
									title="Tahun perolehan harus antara 1900 hingga tahun sekarang"
								/>
							</div>
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
								{#each data.masterData.metodePenyusutanKomersial as metode}
									<option
										value={metode.id}
										selected={metode.id === data.asset.metodePenyusutanKomersialId}
									>
										{metode.keterangan}
									</option>
								{/each}
							</select>
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
								{#each data.masterData.metodePenyusutanFiskal as metode}
									<option
										value={metode.id}
										selected={metode.id === data.asset.metodePenyusutanFiskalId}
									>
										{metode.keterangan}
									</option>
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
								value={formatRupiah(data.asset.hargaPerolehan)}
								oninput={(e) => handleCurrencyInput(e, 'hargaPerolehan')}
								maxlength="16"
								required
								title="Harga perolehan harus berupa angka positif"
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
								value={formatRupiah(data.asset.nilaiSisaBuku)}
								oninput={(e) => handleCurrencyInput(e, 'nilaiSisaBuku')}
								maxlength="16"
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
								value={formatRupiah(data.asset.penyusutanFiskalTahunIni)}
								oninput={(e) => handleCurrencyInput(e, 'penyusutanFiskalTahunIni')}
								maxlength="16"
								required
								title="Penyusutan fiskal tahun ini harus berupa angka positif atau 0"
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
						maxlength="1000">{data.asset.keterangan || ''}</textarea
					>
				</div>

				<div class="mt-6 flex justify-end space-x-4">
					<a href={`/assets/${data.asset.id}`} class="btn btn-outline">Batal</a>
					<button type="submit" class="btn btn-primary gap-2">
						<Save class="h-4 w-4" />
						Simpan Perubahan
					</button>
				</div>
			</form>
		</div>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>
</div>
