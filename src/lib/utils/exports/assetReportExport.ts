import { browser } from '$app/environment';

// Dynamically import xlsx
let XLSX: any;
if (browser) {
	import('xlsx').then((mod) => {
		XLSX = mod;
	});
}

export async function exportToExcel(assets: any[]) {
	if (!browser) {
		console.warn('Excel export is only available in browser environment');
		return;
	}
    
    if (!XLSX) {
		await new Promise<void>((resolve) => {
			const checkXLSX = () => {
				if (XLSX) {
					resolve();
				} else {
					setTimeout(checkXLSX, 100);
				}
			};
			checkXLSX();
		});
	}

	const wb = XLSX.utils.book_new();
	const ws_data = [];

    // Title
    ws_data.push(['Laporan Aset']);
    ws_data.push([]); // Empty row

	// Table Header
	const header = [
        'No',
		'Nama Harta',
        'Kode/Jenis Usaha',
		'Jenis Harta',
		'Kelompok Harta',
		'Perolehan',
		'Harga Perolehan',
		'Nilai Sisa Buku',
		'Penyusutan Fiskal Tahun Ini',
	];
	ws_data.push(header);

	// Table Body
	assets.forEach((asset, i) => {
        const row = [
            i + 1,
            asset.namaHarta,
            asset.kode || asset.jenisUsaha,
            asset.jenisHarta.keterangan,
            asset.kelompokHarta.keterangan,
            `${asset.bulanPerolehan}/${asset.tahunPerolehan}`,
            asset.hargaPerolehan,
            asset.nilaiSisaBuku,
            asset.penyusutanFiskalTahunIni,
        ];
        ws_data.push(row);
	});

    const totalHargaPerolehan = assets.reduce((sum, asset) => sum + asset.hargaPerolehan, 0);
    const totalNilaiSisaBuku = assets.reduce((sum, asset) => sum + asset.nilaiSisaBuku, 0);
    const totalPenyusutan = assets.reduce((sum, asset) => sum + asset.penyusutanFiskalTahunIni, 0);

    ws_data.push([]); // empty row
    ws_data.push([
        'Total', '', '', '', '', '',
        totalHargaPerolehan, 
        totalNilaiSisaBuku, 
        totalPenyusutan,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Column widths
    ws['!cols'] = [
        { wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 25 },
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }
    ];

    // Apply number formatting for currency columns
    const currencyFormat = '#,##0';
    for (let i = 3; i < ws_data.length; i++) { // Start from after header
        for (let j = 6; j <= 8; j++) { // Currency columns
            if(ws_data[i] && typeof ws_data[i][j] === 'number') {
                const cellRef = XLSX.utils.encode_cell({r: i, c: j});
                if(ws[cellRef]) ws[cellRef].z = currencyFormat;
            }
        }
    }


	XLSX.utils.book_append_sheet(wb, ws, 'Laporan Aset');

	const now = new Date();
	const filename = `laporan_aset_${now.getFullYear()}-${(now.getMonth() + 1)
		.toString()
		.padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

	XLSX.writeFile(wb, filename);
}
