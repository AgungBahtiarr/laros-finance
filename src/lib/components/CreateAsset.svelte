<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { masterData } = $props();
	let form;

	// State untuk nilai currency
	let hargaPerolehan = $state('');
	let nilaiSisaBuku = $state('');
	let penyusutanFiskalTahunIni = $state('');

	// jenisUsaha otomatis
	let jenisUsaha = $state('');
	let jenisHartaId = $state('');
	let kelompokHartaId = $state('');

	$effect(() => {
		if (jenisHartaId && kelompokHartaId) {
			jenisUsaha = `${jenisHartaId}${kelompokHartaId}`;
		} else {
			jenisUsaha = '';
		}
	});

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

	// Generate kode asset based on input fields
	function generateKode() {
		const namaHartaInput = document.getElementById('namaHarta') as HTMLInputElement;
		const lokasiInput = document.getElementById('lokasi') as HTMLTextAreaElement;
		const kodeInput = document.getElementById('kode') as HTMLInputElement;

		if (namaHartaInput?.value) {
			const namaPart = namaHartaInput.value.slice(0, 3).toUpperCase();
			const timestamp = new Date().getTime().toString().slice(-6);

			// Try to extract a location identifier or use LOC as default
			let lokasiPart = 'LOC';
			if (lokasiInput?.value) {
				// If it's an iframe, try to extract some location info
				const match = lokasiInput.value.match(/!3d([\d.-]+)!2d([\d.-]+)/);
				if (match) {
					// Use part of the coordinates for uniqueness
					lokasiPart = 'MAP';
				} else {
					// Just use the first 3 non-tag characters
					const textOnly = lokasiInput.value.replace(/<[^>]*>/g, '').trim();
					if (textOnly.length >= 3) {
						lokasiPart = textOnly.slice(0, 3).toUpperCase();
					}
				}
			}

			kodeInput.value = `${namaPart}-${lokasiPart}-${timestamp}`;
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
			generateKode();
		}
	}

	$effect(() => {
		if (form) form.reset();
		hargaPerolehan = '';
		jenisUsaha = '';
		jenisHartaId = '';
		kelompokHartaId = '';
	});

	function handleSubmit() {
		return async ({ result }) => {
			if (result.type === 'success') {
				document.getElementById('createAsset')?.close();
				goto(page.url.pathname, { invalidateAll: true });
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
									minlength="3"
									maxlength="255"
									pattern="[A-Za-z0-9\s\-_.]+"
									title="Nama harta hanya boleh mengandung huruf, angka, spasi, tanda hubung, garis bawah, dan titik"
									onchange={generateKode}
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
									value={jenisUsaha}
									class="input input-bordered w-full"
									required
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
									title="Masukkan iframe Google Maps yang valid"
								></textarea>
								<div id="error-lokasi" class="mt-2 text-sm text-red-500"></div>
							</div>

							<div class="form-control w-full">
								<label class="label" for="kode">
									<span class="label-text">Kode Aset</span>
									<span class="label-text-alt">
										<button
											type="button"
											class="text-primary text-xs hover:underline"
											onclick={generateKode}
										>
											Generate
										</button>
									</span>
								</label>
								<input
									id="kode"
									type="text"
									name="kode"
									class="input input-bordered w-full"
									placeholder="Kode unik aset"
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
									bind:value={jenisHartaId}
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
									bind:value={kelompokHartaId}
									class="select select-bordered w-full"
									required
								>
									<option value="">Pilih Kelompok Harta</option>
									{#each masterData.kelompokHarta as kelompok}
										<option value={kelompok.id}>{kelompok.keterangan}</option>
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
										step="1"
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
									{#each masterData.metodePenyusutanKomersial as metode}
										<option value={metode.id}>{metode.keterangan}</option>
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
									maxlength="16"
									required
									title="Harga perolehan harus berupa angka positif"
								/>
								<input type="hidden" name="hargaPerolehan" value={hargaPerolehan} />
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
									maxlength="1000"
								></textarea>
							</div>

							<!-- Footer -->
							<div class="modal-action mt-6 border-t p-4">
								<button type="submit" class="btn btn-primary">Simpan</button>
								<button
									type="button"
									class="btn"
									onclick={() => document.getElementById('createAsset')?.close()}
								>
									Batal
								</button>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</dialog>
