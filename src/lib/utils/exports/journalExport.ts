import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from '../utils.client';

// Only initialize pdfMake in the browser
let pdfMakeInstance: any = null;
async function initializePdfMake() {
	if (typeof window !== 'undefined' && !pdfMakeInstance) {
		const pdfMake = (await import('pdfmake/build/pdfmake')).default;
		const fonts = await import('pdfmake/build/vfs_fonts');
		pdfMake.vfs = (fonts as any).pdfMake.vfs;
		pdfMakeInstance = pdfMake;
		return pdfMake;
	}
	if (pdfMakeInstance) {
		return pdfMakeInstance;
	}
	throw new Error('PDF generation is only available in the browser');
}

interface JournalDetail {
	accountCode: string;
	accountName: string;
	description: string;
	debit: number;
	credit: number;
}

interface JournalEntry {
	number: string;
	date: string;
	description: string;
	details: JournalDetail[];
}

interface JournalData {
	entries: JournalEntry[];
	totals: {
		debit: number;
		credit: number;
	};
	period: {
		start: string;
		end: string;
	};
}

export async function exportJournalToPdf(data: JournalData) {
	const pdfMake = await initializePdfMake();

	const content: Content[] = [
		{
			columns: [
				{
					width: '*',
					text: 'LAPORAN JURNAL',
					style: 'header',
					alignment: 'center'
				}
			]
		},
		{
			columns: [
				{
					width: '*',
					text: `Periode: ${formatDate(data.period.start)} s/d ${formatDate(data.period.end)}`,
					style: 'subheader',
					alignment: 'center'
				}
			],
			margin: [0, 0, 0, 20]
		}
	];

	// Add entries
	data.entries.forEach((entry) => {
		// Add journal header
		content.push(
			{
				table: {
					widths: ['auto', '*', 'auto', '*'],
					body: [
						[
							{ text: 'Nomor', style: 'tableHeader' },
							{ text: entry.number, style: 'tableCell' },
							{ text: 'Tanggal', style: 'tableHeader' },
							{ text: formatDate(entry.date), style: 'tableCell' }
						]
					]
				},
				layout: 'noBorders'
			},
			{
				table: {
					widths: ['auto', '*'],
					body: [
						[
							{ text: 'Deskripsi', style: 'tableHeader' },
							{ text: entry.description, style: 'tableCell' }
						]
					]
				},
				layout: 'noBorders',
				margin: [0, 5, 0, 5]
			}
		);

		// Add journal details
		const detailsTable = {
			table: {
				headerRows: 1,
				widths: ['auto', '*', 'auto', 'auto'],
				body: [
					[
						{ text: 'Kode Akun', style: 'tableHeader', alignment: 'center' },
						{ text: 'Nama Akun', style: 'tableHeader', alignment: 'center' },
						{ text: 'Debit', style: 'tableHeader', alignment: 'center' },
						{ text: 'Kredit', style: 'tableHeader', alignment: 'center' }
					],
					...entry.details.map((detail) => [
						{ text: detail.accountCode, style: 'tableCell', alignment: 'center' },
						{ text: detail.accountName, style: 'tableCell' },
						{
							text: detail.debit ? formatCurrency(detail.debit) : '',
							style: 'tableCell',
							alignment: 'right'
						},
						{
							text: detail.credit ? formatCurrency(detail.credit) : '',
							style: 'tableCell',
							alignment: 'right'
						}
					])
				]
			},
			layout: {
				hLineWidth: function (i: number, node: any) {
					return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0;
				},
				vLineWidth: function (i: number) {
					return 1;
				},
				hLineColor: function (i: number) {
					return '#aaaaaa';
				},
				vLineColor: function (i: number) {
					return '#aaaaaa';
				},
				paddingLeft: function (i: number) {
					return 5;
				},
				paddingRight: function (i: number) {
					return 5;
				},
				paddingTop: function (i: number) {
					return 3;
				},
				paddingBottom: function (i: number) {
					return 3;
				}
			}
		};

		content.push(detailsTable);

		// Add entry total
		const entryDebitTotal = entry.details.reduce((sum, d) => sum + (d.debit || 0), 0);
		const entryCreditTotal = entry.details.reduce((sum, d) => sum + (d.credit || 0), 0);

		content.push({
			table: {
				widths: ['*', 'auto', 'auto'],
				body: [
					[
						{ text: 'Total', style: 'totalRow', alignment: 'right' },
						{
							text: formatCurrency(entryDebitTotal),
							style: 'totalRow',
							alignment: 'right'
						},
						{
							text: formatCurrency(entryCreditTotal),
							style: 'totalRow',
							alignment: 'right'
						}
					]
				]
			},
			layout: 'noBorders',
			margin: [0, 0, 0, 20]
		});
	});

	// Add report summary
	content.push({
		table: {
			widths: ['*', 'auto', 'auto'],
			body: [
				[
					{ text: 'TOTAL JURNAL', style: 'totalHeader', alignment: 'right' },
					{
						text: formatCurrency(data.totals.debit),
						style: 'totalHeader',
						alignment: 'right'
					},
					{
						text: formatCurrency(data.totals.credit),
						style: 'totalHeader',
						alignment: 'right'
					}
				]
			]
		},
		layout: {
			hLineWidth: function (i: number) {
				return 1;
			},
			vLineWidth: function (i: number) {
				return 0;
			},
			hLineColor: function (i: number) {
				return '#aaaaaa';
			}
		}
	});

	const docDefinition: TDocumentDefinitions = {
		content,
		styles: {
			header: {
				fontSize: 16,
				bold: true,
				margin: [0, 0, 0, 10]
			},
			subheader: {
				fontSize: 12,
				margin: [0, 0, 0, 5]
			},
			tableHeader: {
				fontSize: 11,
				bold: true,
				fillColor: '#f3f4f6'
			},
			tableCell: {
				fontSize: 10
			},
			totalRow: {
				fontSize: 10,
				bold: true
			},
			totalHeader: {
				fontSize: 11,
				bold: true
			}
		},
		defaultStyle: {
			font: 'Helvetica'
		},
		pageSize: 'A4',
		pageOrientation: 'portrait',
		pageMargins: [40, 40, 40, 40]
	};

	pdfMake.createPdf(docDefinition).download('laporan-jurnal.pdf');
}

export async function exportJournalToExcel(data: JournalData) {
	const workbook = XLSX.utils.book_new();
	const rows: any[] = [];

	// Add title and period
	rows.push(['LAPORAN JURNAL']);
	rows.push([`Periode: ${formatDate(data.period.start)} s/d ${formatDate(data.period.end)}`]);
	rows.push([]); // Empty row for spacing

	// Add entries
	data.entries.forEach((entry) => {
		// Add journal header
		rows.push(['Nomor:', entry.number, 'Tanggal:', formatDate(entry.date)]);
		rows.push(['Deskripsi:', entry.description]);
		rows.push([]); // Empty row for spacing

		// Add details header
		rows.push(['Kode Akun', 'Nama Akun', 'Debit', 'Kredit']);

		// Add details
		entry.details.forEach((detail) => {
			rows.push([detail.accountCode, detail.accountName, detail.debit || '', detail.credit || '']);
		});

		// Add entry total
		const entryDebitTotal = entry.details.reduce((sum, d) => sum + (d.debit || 0), 0);
		const entryCreditTotal = entry.details.reduce((sum, d) => sum + (d.credit || 0), 0);
		rows.push(['', 'Total', entryDebitTotal, entryCreditTotal]);

		rows.push([]); // Empty row for spacing
		rows.push([]); // Empty row for spacing
	});

	// Add report summary
	rows.push(['', 'TOTAL JURNAL', data.totals.debit, data.totals.credit]);

	const worksheet = XLSX.utils.aoa_to_sheet(rows);

	// Set column widths
	const colWidths = [
		{ wch: 15 }, // Kode Akun
		{ wch: 40 }, // Nama Akun/Deskripsi
		{ wch: 15 }, // Debit
		{ wch: 15 } // Kredit
	];
	worksheet['!cols'] = colWidths;

	// Apply styles
	const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
	for (let row = range.s.r; row <= range.e.r; row++) {
		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
			if (!worksheet[cellRef]) continue;

			worksheet[cellRef].s = {
				font: { name: 'Arial', sz: 10 },
				alignment: {
					vertical: 'center',
					horizontal: col >= 2 ? 'right' : 'left'
				}
			};
		}
	}

	XLSX.utils.book_append_sheet(workbook, worksheet, 'Jurnal');
	XLSX.writeFile(workbook, 'laporan-jurnal.xlsx');
}
