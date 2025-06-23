<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Save, Image } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let form;
	let initialized = $state(false);

	// State untuk nilai currency
	let hargaPerolehan = $state(data.asset.hargaPerolehan.toString());
	let nilaiSisaBuku = $state(data.asset.nilaiSisaBuku.toString());
	let penyusutanFiskalTahunIni = $state(data.asset.penyusutanFiskalTahunIni.toString());

	// State untuk field lainnya
	let jenisHartaId = $state(data.asset.jenisHartaId.toString());
	let kelompokHartaId = $state(data.asset.kelompokHartaId.toString());
	let metodePenyusutanFiskalId = $state(data.asset.metodePenyusutanFiskalId.toString());
	let tahunPerolehan = $state(data.asset.tahunPerolehan);
	let bulanPerolehan = $state(data.asset.bulanPerolehan);
	let jenisUsaha = $state(data.asset.jenisUsaha);

	// Mendapatkan tahun berjalan dan masa pemakaian aset
	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1;

	// Track if all required fields are filled for calculation
	let allFieldsReady = $derived(
		hargaPerolehan &&
			jenisHartaId &&
			kelompokHartaId &&
			metodePenyusutanFiskalId &&
			tahunPerolehan &&
			bulanPerolehan &&
			initialized
	);

	// Function to calculate book value and depreciation
	function calculateValues() {
		if (!allFieldsReady) {
			return;
		}

		// Convert values to numbers
		const hargaPerolehanNum = parseInt(hargaPerolehan);
		const tahunPerolehanNum = parseInt(tahunPerolehan.toString());
		const bulanPerolehanNum = parseInt(bulanPerolehan.toString());
		const jenisHartaIdNum = parseInt(jenisHartaId);
		const kelompokHartaIdNum = parseInt(kelompokHartaId);
		const metodePenyusutanFiskalIdNum = parseInt(metodePenyusutanFiskalId);

		// Hitung masa pemakaian dalam tahun (tahun berjalan - tahun perolehan)
		let lamaPemakaianTahun = currentYear - tahunPerolehanNum;

		// Jika bulan perolehan lebih besar dari bulan saat ini dan belum genap 1 tahun, kurangi 1
		if (currentMonth < bulanPerolehanNum && lamaPemakaianTahun > 0) {
			lamaPemakaianTahun -= 1;
		}

		// Untuk aset baru, lama pemakaian minimal 0
		lamaPemakaianTahun = Math.max(0, lamaPemakaianTahun);

		// Ambil tarif penyusutan berdasarkan jenis, kelompok dan metode
		const tarifPenyusutan = getTarifPenyusutan(
			jenisHartaIdNum,
			kelompokHartaIdNum,
			metodePenyusutanFiskalIdNum
		);

		// Tentukan masa manfaat berdasarkan kelompok harta
		let masaManfaat = getMasaManfaat(jenisHartaIdNum, kelompokHartaIdNum);

		let nilaiSisaBukuValue = 0;
		let penyusutanTahunIniValue = 0;

		// Metode Garis Lurus (id: 1)
		if (metodePenyusutanFiskalIdNum === 1) {
			// Penyusutan per tahun
			const penyusutanPerTahun = hargaPerolehanNum / masaManfaat;

			// Jika masih dalam masa manfaat, hitung nilai sisa buku dan penyusutan normal
			if (lamaPemakaianTahun < masaManfaat) {
				// Total penyusutan sampai tahun ini
				const totalPenyusutan = lamaPemakaianTahun * penyusutanPerTahun;

				// Nilai sisa buku = harga perolehan - total penyusutan
				nilaiSisaBukuValue = hargaPerolehanNum - totalPenyusutan;

				// Penyusutan tahun ini
				penyusutanTahunIniValue = penyusutanPerTahun;
			}
			// Jika sudah melebihi masa manfaat
			else {
				// Nilai sisa buku adalah nilai residu (0 atau nilai minimal)
				nilaiSisaBukuValue = 0;

				// Tidak ada penyusutan tahun ini
				penyusutanTahunIniValue = 0;
			}
		}
		// Metode Saldo Menurun (id: 2)
		else if (metodePenyusutanFiskalIdNum === 2) {
			// Nilai sisa buku awal adalah harga perolehan
			let nilaiSisaBukuAwal = hargaPerolehanNum;

			// Hitung penyusutan dan nilai sisa buku selama tahun-tahun pemakaian sebelumnya
			for (let tahun = 1; tahun <= lamaPemakaianTahun; tahun++) {
				// Jika sudah melebihi masa manfaat, tidak ada penyusutan lagi
				if (tahun > masaManfaat) {
					break;
				}

				const penyusutanTahun = nilaiSisaBukuAwal * tarifPenyusutan;
				nilaiSisaBukuAwal -= penyusutanTahun;
			}

			// Nilai sisa buku untuk tahun saat ini adalah hasil perhitungan sebelumnya
			nilaiSisaBukuValue = nilaiSisaBukuAwal;

			// Hitung penyusutan untuk tahun ini
			if (lamaPemakaianTahun < masaManfaat) {
				penyusutanTahunIniValue = nilaiSisaBukuValue * tarifPenyusutan;

				// Perbarui nilai sisa buku setelah penyusutan tahun ini
				nilaiSisaBukuValue -= penyusutanTahunIniValue;
			} else {
				// Tidak ada penyusutan jika sudah melebihi masa manfaat
				penyusutanTahunIniValue = 0;
			}
		}

		// Jangan sampai nilai sisa buku negatif
		nilaiSisaBukuValue = Math.max(0, nilaiSisaBukuValue);

		// Update state dengan pembulatan
		nilaiSisaBuku = Math.round(nilaiSisaBukuValue).toString();

		penyusutanFiskalTahunIni = Math.round(
			(penyusutanTahunIniValue / 12) * (12 - bulanPerolehanNum + 1)
		).toString();

		// Update input fields (dengan setTimeout agar diberikan waktu DOM update)
		setTimeout(() => {
			const nilaiSisaBukuInput = document.getElementById('nilaiSisaBuku') as HTMLInputElement;
			const penyusutanInput = document.getElementById(
				'penyusutanFiskalTahunIni'
			) as HTMLInputElement;

			if (nilaiSisaBukuInput) nilaiSisaBukuInput.value = formatRupiah(nilaiSisaBuku);
			if (penyusutanInput) penyusutanInput.value = formatRupiah(penyusutanFiskalTahunIni);
		}, 0);
	}

	// Function to get masa manfaat based on jenis harta and kelompok
	function getMasaManfaat(jenisHartaId, kelompokHartaId) {
		// Harta Berwujud Bukan Bangunan or Harta Tak Berwujud
		if (jenisHartaId === 1 || jenisHartaId === 3) {
			if (kelompokHartaId === 1) return 4; // Kelompok 1
			if (kelompokHartaId === 2) return 8; // Kelompok 2
			if (kelompokHartaId === 3) return 16; // Kelompok 3
			if (kelompokHartaId === 4) return 20; // Kelompok 4
		}
		// Harta Berwujud Bangunan
		else if (jenisHartaId === 2) {
			if (kelompokHartaId === 5) return 20; // Permanen
			if (kelompokHartaId === 6) return 10; // Tidak Permanen
		}
		return 4; // Default value
	}

	function getTarifPenyusutan(jenisHartaId, kelompokHartaId, metodePenyusutanFiskalId) {
		// Jenis Harta: 1 = Harta Berwujud Bukan Bangunan, 2 = Harta Berwujud Bangunan, 3 = Harta Tak Berwujud
		// Metode Penyusutan: 1 = Garis Lurus, 2 = Saldo Menurun

		const isGarisLurus = metodePenyusutanFiskalId === 1;

		// Harta Berwujud Bukan Bangunan
		if (jenisHartaId === 1) {
			// Kelompok 1 (masa manfaat 4 tahun)
			if (kelompokHartaId === 1) return isGarisLurus ? 0.25 : 0.5;
			// Kelompok 2 (masa manfaat 8 tahun)
			if (kelompokHartaId === 2) return isGarisLurus ? 0.125 : 0.25;
			// Kelompok 3 (masa manfaat 16 tahun)
			if (kelompokHartaId === 3) return isGarisLurus ? 0.0625 : 0.125;
			// Kelompok 4 (masa manfaat 20 tahun)
			if (kelompokHartaId === 4) return isGarisLurus ? 0.05 : 0.1;
		}
		// Harta Berwujud Bangunan (hanya boleh Garis Lurus)
		else if (jenisHartaId === 2) {
			// Permanen (masa manfaat 20 tahun)
			if (kelompokHartaId === 5) return 0.05;
			// Tidak Permanen (masa manfaat 10 tahun)
			if (kelompokHartaId === 6) return 0.1;
		}
		// Harta Tak Berwujud (tergantung masa manfaat)
		else if (jenisHartaId === 3) {
			// Kelompok 1 (masa manfaat 4 tahun)
			if (kelompokHartaId === 1) return isGarisLurus ? 0.25 : 0.5;
			// Kelompok 2 (masa manfaat 8 tahun)
			if (kelompokHartaId === 2) return isGarisLurus ? 0.125 : 0.25;
			// Kelompok 3 (masa manfaat 16 tahun)
			if (kelompokHartaId === 3) return isGarisLurus ? 0.0625 : 0.125;
			// Kelompok 4 (masa manfaat 20 tahun)
			if (kelompokHartaId === 4) return isGarisLurus ? 0.05 : 0.1;
		}

		return 0;
	}

	$effect(() => {
		if (allFieldsReady) {
			calculateValues();
		}
	});

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
				// Calculation is handled by the effect now
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

	$effect(() => {
		if (jenisHartaId && kelompokHartaId) {
			jenisUsaha = `${jenisHartaId}${kelompokHartaId}`;
		} else {
			jenisUsaha = '';
		}
	});

	function handleSubmit() {
		return async ({ result }) => {
			goto(`/assets/${data.asset.id}`, { invalidateAll: true });
		};
	}

	// Calculate initial values on load
	onMount(() => {
		// Set flag to prevent premature calculation
		setTimeout(() => {
			initialized = true;

			// Ensure select fields are properly set with initial values
			const jenisHartaSelect = document.getElementById('jenisHartaId') as HTMLSelectElement;
			const kelompokHartaSelect = document.getElementById('kelompokHartaId') as HTMLSelectElement;
			const metodePenyusutanFiskalSelect = document.getElementById(
				'metodePenyusutanFiskalId'
			) as HTMLSelectElement;

			if (jenisHartaSelect) jenisHartaSelect.value = jenisHartaId;
			if (kelompokHartaSelect) kelompokHartaSelect.value = kelompokHartaId;
			if (metodePenyusutanFiskalSelect)
				metodePenyusutanFiskalSelect.value = metodePenyusutanFiskalId;

			// Only call calculate after ensuring all values are properly set
			calculateValues();
		}, 100);
	});
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
			<form
				method="POST"
				action="?/update"
				enctype="multipart/form-data"
				use:enhance={handleSubmit}
			>
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
								title="Nama harta"
							/>
						</div>

						<div class="grid grid-cols-2 gap-4">
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
									{#each data.masterData.jenisHarta as jenis}
										<option
											value={jenis.id}
											selected={parseInt(jenis.id) === data.asset.jenisHartaId}
										>
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
									bind:value={kelompokHartaId}
									class="select select-bordered w-full"
									required
								>
									<option value="">Pilih Kelompok Harta</option>
									{#if parseInt(jenisHartaId) === 1 || parseInt(jenisHartaId) === 3}
										{#each data.masterData.kelompokHarta.filter((k) => k.id >= 1 && k.id <= 4) as kelompok}
											<option value={kelompok.id.toString()}>
												{kelompok.keterangan}
											</option>
										{/each}
									{:else if parseInt(jenisHartaId) === 2}
										{#each data.masterData.kelompokHarta.filter((k) => k.id >= 5 && k.id <= 6) as kelompok}
											<option value={kelompok.id.toString()}>
												{kelompok.keterangan}
											</option>
										{/each}
									{:else}
										{#each data.masterData.kelompokHarta as kelompok}
											<option value={kelompok.id.toString()}>
												{kelompok.keterangan}
											</option>
										{/each}
									{/if}
								</select>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
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
								<label class="label" for="jenisUsaha">
									<span class="label-text">Jenis Usaha</span>
								</label>
								<input
									id="jenisUsaha"
									type="text"
									name="jenisUsaha"
									class="input input-bordered w-full"
									value={jenisUsaha}
									required
									readonly
								/>
							</div>
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
									bind:value={bulanPerolehan}
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
									bind:value={tahunPerolehan}
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
										selected={parseInt(metode.id) === data.asset.metodePenyusutanKomersialId}
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
										selected={parseInt(metode.id) === data.asset.metodePenyusutanFiskalId}
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
								<span class="label-text-alt text-gray-500">(Otomatis)</span>
							</label>
							<input
								id="nilaiSisaBuku"
								type="text"
								class="input input-bordered w-full bg-gray-50"
								value={formatRupiah(data.asset.nilaiSisaBuku)}
								readonly
								maxlength="16"
								required
							/>
							<input type="hidden" name="nilaiSisaBuku" value={nilaiSisaBuku} />
						</div>

						<div class="form-control w-full">
							<label class="label" for="penyusutanFiskalTahunIni">
								<span class="label-text">Penyusutan Fiskal Tahun Ini</span>
								<span class="label-text-alt text-gray-500">(Otomatis)</span>
							</label>
							<input
								id="penyusutanFiskalTahunIni"
								type="text"
								class="input input-bordered w-full bg-gray-50"
								value={formatRupiah(data.asset.penyusutanFiskalTahunIni)}
								readonly
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

						<div class="form-control w-full">
							<label class="label" for="image">
								<span class="label-text">Gambar Aset</span>
							</label>
							{#if data.asset.imageUrl}
								<div class="mb-3">
									<img
										src={data.asset.imageUrl}
										alt={data.asset.namaHarta}
										class="mb-2 h-48 w-auto rounded-md object-cover"
									/>
									<p class="text-xs text-gray-500">
										Upload gambar baru untuk mengganti gambar saat ini
									</p>
								</div>
							{/if}
							<input
								id="image"
								type="file"
								name="image"
								class="file-input file-input-bordered w-full"
								accept="image/*"
							/>
						</div>
					</div>
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
	</div>
</div>
