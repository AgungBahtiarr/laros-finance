import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type * as pdfMakeType from 'pdfmake/build/pdfmake';
import type { WorkBook } from 'xlsx';
import { browser } from '$app/environment';

// Dynamically import pdfmake and fonts only in browser
let pdfMake: typeof pdfMakeType;
let XLSX: any;

if (browser) {
	// Import pdfmake dynamically
	import('pdfmake/build/pdfmake').then((pdfMakeModule) => {
		pdfMake = pdfMakeModule.default;
		// Import fonts after pdfmake is loaded
		import('pdfmake/build/vfs_fonts').then((pdfFontsModule: any) => {
			pdfMake.vfs = pdfFontsModule.pdfMake.vfs;
		});
	});

	// Import XLSX dynamically
	import('xlsx').then((XLSXModule) => {
		XLSX = XLSXModule;
	});
}

interface AccountBalance {
	name: string;
	balance: number;
	level: number;
	id: number;
	debit: number;
	credit: number;
	groupName?: string;
}

interface ProfitLossData {
	pendapatan: AccountBalance[];
	hargaPokok: AccountBalance[];
	biayaOperasional: AccountBalance[];
	biayaOperasionalLainnya: AccountBalance[];
	biayaAdministrasiUmum: AccountBalance[];
	pendapatanBiayaLainLain: AccountBalance[];
	netIncome: number;
	revenueTotals: { balance: number };
	expenseTotals: { balance: number };
	previousPeriod?: {
		revenues: AccountBalance[];
		expenses: AccountBalance[];
		netIncome: number;
	};
}

interface TableCell {
	text: string;
	alignment?: string;
	margin?: number[];
	style?: string;
	fillColor?: string;
	bold?: boolean;
	colSpan?: number;
}

function formatForPdf(amount: number): string {
    if (amount === null || amount === undefined) return '-';
    const num = Number(amount);
    if (num === 0) return '0';
    if (num < 0) {
        return `(${Math.abs(num).toLocaleString('id-ID')})`;
    }
    return num.toLocaleString('id-ID');
}

function getGroupedRows(accounts: AccountBalance[]): TableCell[][] {
	const rows: TableCell[][] = [];

	accounts.forEach((account) => {
		if (account.balance !== 0) {
			const row: TableCell[] = [
				{ text: account.name, margin: [account.level * 10, 0, 0, 0] },
				{ text: formatForPdf(account.balance || 0), alignment: 'right' }
			];
			rows.push(row);
		}
	});

	return rows;
}

export async function exportToPdf(
	data: ProfitLossData,
	dateRange: { start: string; end: string },
	showPercentages: boolean,
	compareWithPrevious: boolean
) {
	if (!browser) {
		console.warn('PDF export is only available in browser environment');
		return;
	}

	if (!pdfMake) {
		await new Promise<void>((resolve) => {
			const checkPdfMake = () => {
				if (pdfMake) {
					resolve();
				} else {
					setTimeout(checkPdfMake, 100);
				}
			};
			checkPdfMake();
		});
	}

	const tableBody: TableCell[][] = [
		getTableHeaders(showPercentages, compareWithPrevious),
	];

	const sections = [
		{ title: 'Pendapatan', data: data.pendapatan },
		{ title: 'Harga Pokok (COGS/HPP)', data: data.hargaPokok },
		{ title: 'Biaya Operasional', data: data.biayaOperasional },
		{ title: 'Biaya Operasional Lainnya', data: data.biayaOperasionalLainnya },
		{ title: 'Biaya Administrasi & Umum', data: data.biayaAdministrasiUmum },
		{ title: '(Pendapatan) Biaya Lain-Lain', data: data.pendapatanBiayaLainLain },
	];

	sections.forEach((section) => {
		if (section.data && section.data.length > 0) {
			tableBody.push([
				{
					text: section.title,
					style: 'sectionHeader',
					colSpan: getColumnCount(showPercentages, compareWithPrevious),
					fillColor: '#f0f0f0'
				},
				...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
			]);

			const accountRows = getGroupedRows(section.data);
			tableBody.push(...accountRows);

			const sectionTotal = section.data.reduce((sum, acc) => sum + (acc.balance || 0), 0);
			const totalRow: TableCell[] = [
				{ text: `Total ${section.title}`, bold: true },
				{ text: formatForPdf(sectionTotal), alignment: 'right', bold: true }
			];

			const colCount = getColumnCount(showPercentages, compareWithPrevious);
			while (totalRow.length < colCount) {
				totalRow.push({ text: '' });
			}
			tableBody.push(totalRow);
		}
	});

	tableBody.push(getNetIncomeRow(data, showPercentages, compareWithPrevious));


	const docDefinition: TDocumentDefinitions = {
		content: [
			{ text: 'Laporan Laba Rugi', style: 'header' },
			{
				text: `Periode: ${dateRange.start} sampai ${dateRange.end}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: getColumnWidths(showPercentages, compareWithPrevious),
					body: tableBody
				}
			}
		],
		styles: {
			header: {
				fontSize: 18,
				bold: true,
				margin: [0, 0, 0, 10]
			},
			subheader: {
				fontSize: 14,
				bold: true,
				margin: [0, 0, 0, 5]
			},
			sectionHeader: {
				bold: true
			},
			total: {
				bold: true
			}
		},
		defaultStyle: {
			fontSize: 10
		}
	};

	pdfMake.createPdf(docDefinition).download('laporan-laba-rugi.pdf');
}

export async function exportToExcel(
	data: any, // Using any because the structure is now different
	dateRange: { start: string; end: string },
	showPercentages: boolean,
	compareWithPrevious: boolean
) {
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

	const wsData: (string | number)[][] = [];
	wsData.push(['Laporan Laba Rugi']);
	wsData.push([`Periode: ${dateRange.start} sampai ${dateRange.end}`]);
	wsData.push([]);

	const headers = ['Account', 'Current Periode'];
	wsData.push(headers);

	const sections = [
		{ title: 'Pendapatan', data: data.pendapatan },
		{ title: 'Harga Pokok (COGS/HPP)', data: data.hargaPokok },
		{ title: 'Biaya Operasional', data: data.biayaOperasional },
		{ title: 'Biaya Operasional Lainnya', data: data.biayaOperasionalLainnya },
		{ title: 'Biaya Administrasi & Umum', data: data.biayaAdministrasiUmum },
		{ title: '(Pendapatan) Biaya Lain-Lain', data: data.pendapatanBiayaLainLain },
	];

	sections.forEach(section => {
		if (section.data && section.data.length > 0) {
			wsData.push([section.title]);
			let sectionTotal = 0;
			section.data.forEach((item: AccountBalance) => {
				wsData.push([' '.repeat(item.level) + item.name, formatCurrency(item.balance || 0)]);
				sectionTotal += item.balance || 0;
			});
			wsData.push([`Total ${section.title}`, formatCurrency(sectionTotal)]);
			wsData.push([]);
		}
	});

	wsData.push(['Laba Bersih', formatCurrency(data.netIncome || 0)]);

	const ws = XLSX.utils.aoa_to_sheet(wsData);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Laba Rugi');
	XLSX.writeFile(wb, 'laporan-laba-rugi.xlsx');
}

// Helper functions
function getColumnWidths(showPercentages: boolean, compareWithPrevious: boolean): string[] {
	const widths = ['*', 'auto'];
	if (showPercentages) widths.push('auto');
	if (compareWithPrevious) {
		widths.push('auto');
		if (showPercentages) widths.push('auto');
		widths.push('auto');
	}
	return widths;
}

function getColumnCount(showPercentages: boolean, compareWithPrevious: boolean): number {
	let count = 2; // Account and Current Period
	if (showPercentages) count++;
	if (compareWithPrevious) {
		count += 2; // Previous Period and Change
		if (showPercentages) count++;
	}
	return count;
}

function getTableHeaders(showPercentages: boolean, compareWithPrevious: boolean): TableCell[] {
	const headers: TableCell[] = [
		{ text: 'Account', bold: true },
		{ text: 'Current Periode', alignment: 'right', bold: true }
	];
	if (showPercentages) headers.push({ text: '% dari Pendapatan', alignment: 'right', bold: true });
	if (compareWithPrevious) {
		headers.push({ text: 'Periode Sebelumnya', alignment: 'right', bold: true });
		if (showPercentages) headers.push({ text: '% dari Pendapatan', alignment: 'right', bold: true });
		headers.push({ text: 'Perubahan', alignment: 'right', bold: true });
	}
	return headers;
}

function getNetIncomeRow(
	data: ProfitLossData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: 'Laba Bersih', style: 'total', bold: true },
		{ text: formatForPdf(data.netIncome), alignment: 'right', style: 'total' }
	];

	// Placeholder for future implementation of percentages and comparison
	if (showPercentages) {
		row.push({ text: '', alignment: 'right', style: 'total' });
	}
	if (compareWithPrevious) {
		row.push({ text: '', alignment: 'right', style: 'total' });
		if (showPercentages) {
			row.push({ text: '', alignment: 'right', style: 'total' });
		}
		row.push({ text: '', alignment: 'right', style: 'total' });
	}

	return row;
}

function formatCurrency(amount: number): string {
    if (amount === null || amount === undefined) return '-';
    const num = Number(amount);
    if (num === 0) return '0';
    if (num < 0) {
        return `(${Math.abs(num).toLocaleString('id-ID')})`;
    }
    return num.toLocaleString('id-ID');
}
