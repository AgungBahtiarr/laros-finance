<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Save } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let form;

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

	// Mendapatkan tahun berjalan dan masa pemakaian aset
	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1;

	// Function to calculate book value and depreciation
	function calculateValues() {
		if (
			!hargaPerolehan ||
			!jenisHartaId ||
			!kelompokHartaId ||
			!metodePenyusutanFiskalId ||
			!tahunPerolehan ||
			!bulanPerolehan
		) {
			return;
		}

		// Convert hargaPerolehan to number
		const hargaPerolehanNum = parseInt(hargaPerolehan);

		// Hitung masa pemakaian dalam tahun (tahun berjalan - tahun perolehan)
		// Pertimbangkan juga bulan untuk perhitungan yang lebih akurat
		let lamaPemakaianTahun = currentYear - parseInt(tahunPerolehan.toString());

		// Jika bulan perolehan lebih besar dari bulan saat ini dan belum genap 1 tahun, kurangi 1
		if (currentMonth < parseInt(bulanPerolehan.toString()) && lamaPemakaianTahun > 0) {
			lamaPemakaianTahun -= 1;
		}

		// Untuk aset baru, lama pemakaian minimal 0
		lamaPemakaianTahun = Math.max(0, lamaPemakaianTahun);

		// Ambil tarif penyusutan berdasarkan jenis, kelompok dan metode
		const tarifPenyusutan = getTarifPenyusutan(
			jenisHartaId,
			kelompokHartaId,
			metodePenyusutanFiskalId
		);

		// Tentukan masa manfaat berdasarkan kelompok harta
		let masaManfaat = getMasaManfaat(jenisHartaId, kelompokHartaId);

		let nilaiSisaBukuValue = 0;
		let penyusutanTahunIniValue = 0;

		// Metode Garis Lurus (id: 1)
		if (metodePenyusutanFiskalId === '1') {
			// Penyusutan per tahun
			const penyusutanPerTahun = hargaPerolehanNum / masaManfaat;

			// Total penyusutan sampai tahun ini
			const totalPenyusutan = lamaPemakaianTahun * penyusutanPerTahun;

			// Penyusutan tahun ini adalah penyusutan per tahun jika masih dalam masa manfaat
			penyusutanTahunIniValue = lamaPemakaianTahun < masaManfaat ? penyusutanPerTahun : 0;

			// Nilai sisa buku = harga perolehan - total penyusutan
			nilaiSisaBukuValue = hargaPerolehanNum - totalPenyusutan;

			// Jangan sampai nilai sisa buku negatif
			nilaiSisaBukuValue = Math.max(0, nilaiSisaBukuValue);
		}
		// Metode Saldo Menurun (id: 2)
		else if (metodePenyusutanFiskalId === '2') {
			let nilaiSisaBukuAwal = hargaPerolehanNum;

			// Hitung penyusutan dan nilai sisa buku selama tahun pemakaian
			for (let tahun = 1; tahun <= lamaPemakaianTahun; tahun++) {
				const penyusutanTahun = nilaiSisaBukuAwal * tarifPenyusutan;
				nilaiSisaBukuAwal -= penyusutanTahun;
			}

			// Penyusutan tahun ini = nilai sisa buku awal tahun ini * tarif
			penyusutanTahunIniValue =
				lamaPemakaianTahun < masaManfaat ? nilaiSisaBukuAwal * tarifPenyusutan : 0;

			// Nilai sisa buku tahun ini
			nilaiSisaBukuValue = nilaiSisaBukuAwal - penyusutanTahunIniValue;

			// Jangan sampai nilai sisa buku negatif
			nilaiSisaBukuValue = Math.max(0, nilaiSisaBukuValue);
		}

		// Update state dengan pembulatan
		nilaiSisaBuku = Math.round(nilaiSisaBukuValue).toString();
		penyusutanFiskalTahunIni = Math.round(penyusutanTahunIniValue).toString();

		// Update input fields
		const nilaiSisaBukuInput = document.getElementById('nilaiSisaBuku') as HTMLInputElement;
		const penyusutanInput = document.getElementById('penyusutanFiskalTahunIni') as HTMLInputElement;

		if (nilaiSisaBukuInput) nilaiSisaBukuInput.value = formatRupiah(nilaiSisaBuku);
		if (penyusutanInput) penyusutanInput.value = formatRupiah(penyusutanFiskalTahunIni);
	}

	// Function to get masa manfaat based on jenis harta and kelompok
	function getMasaManfaat(jenisHartaId, kelompokHartaId) {
		// Harta Berwujud Bukan Bangunan or Harta Tak Berwujud
		if (jenisHartaId === '1' || jenisHartaId === '3') {
			if (kelompokHartaId === '1') return 4; // Kelompok 1
			if (kelompokHartaId === '2') return 8; // Kelompok 2
			if (kelompokHartaId === '3') return 16; // Kelompok 3
			if (kelompokHartaId === '4') return 20; // Kelompok 4
		}
		// Harta Berwujud Bangunan
		else if (jenisHartaId === '2') {
			if (kelompokHartaId === '5') return 20; // Permanen
			if (kelompokHartaId === '6') return 10; // Tidak Permanen
		}
		return 4; // Default value
	}

	function getTarifPenyusutan(jenisHartaId, kelompokHartaId, metodePenyusutanFiskalId) {
		// Jenis Harta: 1 = Harta Berwujud Bukan Bangunan, 2 = Harta Berwujud Bangunan, 3 = Harta Tak Berwujud
		// Metode Penyusutan: 1 = Garis Lurus, 2 = Saldo Menurun

		const isGarisLurus = metodePenyusutanFiskalId === '1';

		// Harta Berwujud Bukan Bangunan
		if (jenisHartaId === '1') {
			// Kelompok 1 (masa manfaat 4 tahun)
			if (kelompokHartaId === '1') return isGarisLurus ? 0.25 : 0.5;
			// Kelompok 2 (masa manfaat 8 tahun)
			if (kelompokHartaId === '2') return isGarisLurus ? 0.125 : 0.25;
			// Kelompok 3 (masa manfaat 16 tahun)
			if (kelompokHartaId === '3') return isGarisLurus ? 0.0625 : 0.125;
			// Kelompok 4 (masa manfaat 20 tahun)
			if (kelompokHartaId === '4') return isGarisLurus ? 0.05 : 0.1;
		}
		// Harta Berwujud Bangunan (hanya boleh Garis Lurus)
		else if (jenisHartaId === '2') {
			// Permanen (masa manfaat 20 tahun)
			if (kelompokHartaId === '5') return 0.05;
			// Tidak Permanen (masa manfaat 10 tahun)
			if (kelompokHartaId === '6') return 0.1;
		}
		// Harta Tak Berwujud (tergantung masa manfaat)
		else if (jenisHartaId === '3') {
			// Kelompok 1 (masa manfaat 4 tahun)
			if (kelompokHartaId === '1') return isGarisLurus ? 0.25 : 0.5;
			// Kelompok 2 (masa manfaat 8 tahun)
			if (kelompokHartaId === '2') return isGarisLurus ? 0.125 : 0.25;
			// Kelompok 3 (masa manfaat 16 tahun)
			if (kelompokHartaId === '3') return isGarisLurus ? 0.0625 : 0.125;
			// Kelompok 4 (masa manfaat 20 tahun)
			if (kelompokHartaId === '4') return isGarisLurus ? 0.05 : 0.1;
		}

		return 0;
	}

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
				calculateValues(); // Recalculate when harga perolehan changes
				break;
			case 'nilaiSisaBuku':
				nilaiSisaBuku = numericValue;
				break;
			case 'penyusutanFiskalTahunIni':
				penyusutanFiskalTahunIni = numericValue;
				break;
		}
	}

	// Handler untuk perubahan pada select inputs
	function handleSelectChange() {
		calculateValues();
	}

	// Handler untuk perubahan tanggal
	function handleDateChange() {
		calculateValues();
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

	// Calculate initial values on load
	onMount(() => {
		calculateValues();
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
								bind:value={jenisHartaId}
								onchange={handleSelectChange}
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
								bind:value={kelompokHartaId}
								onchange={handleSelectChange}
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
									bind:value={bulanPerolehan}
									onchange={handleDateChange}
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
									onchange={handleDateChange}
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
								bind:value={metodePenyusutanFiskalId}
								onchange={handleSelectChange}
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
	</div>
</div>
