import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type * as pdfMakeType from 'pdfmake/build/pdfmake';
import type { WorkBook } from 'xlsx';
function formatCurrency(amount: number | string | null | undefined): string {
	if (amount === null || amount === undefined) return '-';
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	if (isNaN(num)) return '-';

	const formattedNum = new Intl.NumberFormat('id-ID', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(Math.abs(num));

	if (num < 0) {
		return `(${formattedNum})`;
	}

	return formattedNum;
}
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

interface BalanceSheetData {
	aktivaLancar: AccountBalance[];
	totalAktivaLancar: { balance: number };
	aktivaTetap: AccountBalance[];
	totalAktivaTetap: { balance: number };
	akumulasiPenyusutan: AccountBalance[];
	totalAkumulasiPenyusutan: { balance: number };
	aktivaLainnya: AccountBalance[];
	totalAktivaLainnya: { balance: number };
	totalAktiva: {
		debit: number;
		credit: number;
		balance: number;
	};
	hutangLancar: AccountBalance[];
	totalHutangLancar: { balance: number };
	biayaYMHDB: AccountBalance[];
	totalBiayaYMHDB: { balance: number };
	pajakYMHDB: AccountBalance[];
	totalPajakYMHDB: { balance: number };
	hutangJangkaPanjang: AccountBalance[];
	totalHutangJangkaPanjang: { balance: number };
	modal: AccountBalance[];
	totalModal: { balance: number };
	netIncome: number;
	totalPasiva: {
		debit: number;
		credit: number;
		balance: number;
	};
	previousPeriod?: {
		aktivaLancar: AccountBalance[];
		aktivaTetap: AccountBalance[];
		akumulasiPenyusutan: AccountBalance[];
		aktivaLainnya: AccountBalance[];
		hutangLancar: AccountBalance[];
		hutangJangkaPanjang: AccountBalance[];
		modal: AccountBalance[];
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

export async function exportBalanceSheetToPdf(
	data: BalanceSheetData,
	dateRange: { start: string; end: string },
	showPercentages: boolean,
	compareWithPrevious: boolean
) {
	if (!browser) {
		console.warn('PDF export is only available in browser environment');
		return;
	}

	// Wait for pdfMake to be loaded
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

	const pasivaRows: TableCell[][] = [
		// Current Liabilities
		[
			{
				text: 'Hutang Lancar (Current Liabilities)',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getLiabilityRows(
			data.hutangLancar,
			data,
			'hutangLancar',
			showPercentages,
			compareWithPrevious
		),
		getSubTotalRow(
			'Total Hutang Lancar',
			data.totalHutangLancar.balance,
			showPercentages,
			compareWithPrevious
		),
		// Accrued Expenses
		[
			{
				text: 'Biaya Yang Masih Harus Dibayar',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getLiabilityRows(data.biayaYMHDB, data, 'biayaYMHDB', showPercentages, compareWithPrevious),
		getSubTotalRow(
			'Total Biaya YMH Dibayar',
			data.totalBiayaYMHDB.balance,
			showPercentages,
			compareWithPrevious
		),
		// Accrued Taxes
		[
			{
				text: 'Pajak Yang Masih Harus Dibayar',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getLiabilityRows(data.pajakYMHDB, data, 'pajakYMHDB', showPercentages, compareWithPrevious),
		getSubTotalRow(
			'Total Pajak YMH Dibayar',
			data.totalPajakYMHDB.balance,
			showPercentages,
			compareWithPrevious
		),
		// Long-term Liabilities
		[
			{
				text: 'Hutang Jangka Panjang (Long-term Liabilities)',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getLiabilityRows(
			data.hutangJangkaPanjang,
			data,
			'hutangJangkaPanjang',
			showPercentages,
			compareWithPrevious
		),
		getSubTotalRow(
			'Total Hutang Jangka Panjang',
			data.totalHutangJangkaPanjang.balance,
			showPercentages,
			compareWithPrevious
		),
		// Equity
		[
			{
				text: 'Modal (Equity)',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getEquityRows(data.modal, data, showPercentages, compareWithPrevious),
		getSubTotalRow('Total Modal', data.totalModal.balance, showPercentages, compareWithPrevious)
	];

	pasivaRows.push(
		getStandaloneRow('Pendapatan diterima dimuka', showPercentages, compareWithPrevious)
	);

	pasivaRows.push(
		getStandaloneRow('Laba (Rugi) Berjalan', data.netIncome, showPercentages, compareWithPrevious)
	);

	const body: TableCell[][] = [
		getTableHeaders(showPercentages, compareWithPrevious),
		// Assets Section
		[
			{
				text: 'AKTIVA (ASSETS)',
				style: 'sectionHeader',
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f0f0f0'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		// Current Assets
		[
			{
				text: 'Aktiva Lancar (Current Assets)',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getAssetRows(data.aktivaLancar, data, 'aktivaLancar', showPercentages, compareWithPrevious),
		getSubTotalRow(
			'Total Aktiva Lancar',
			data.totalAktivaLancar.balance,
			showPercentages,
			compareWithPrevious
		),
		// Fixed Assets
		[
			{
				text: 'Aktiva Tetap (Fixed Assets)',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getAssetRows(data.aktivaTetap, data, 'aktivaTetap', showPercentages, compareWithPrevious),
		getSubTotalRow(
			'Total Aktiva Tetap',
			data.totalAktivaTetap.balance,
			showPercentages,
			compareWithPrevious
		),
		// Accumulation Depreciation
		[
			{
				text: 'Akumulasi Penyusutan',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getAssetRows(
			data.akumulasiPenyusutan,
			data,
			'akumulasiPenyusutan',
			showPercentages,
			compareWithPrevious
		),
		getSubTotalRow(
			'Total Akumulasi Penyusutan',
			data.totalAkumulasiPenyusutan.balance,
			showPercentages,
			compareWithPrevious
		),
		// Other Assets
		[
			{
				text: 'Aktiva Lainnya (Other Assets)',
				style: 'sectionHeader',
				margin: [10, 2, 0, 2],
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f5f5f5'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...getAssetRows(
			data.aktivaLainnya,
			data,
			'aktivaLainnya',
			showPercentages,
			compareWithPrevious
		),
		getSubTotalRow(
			'Total Aktiva Lainnya',
			data.totalAktivaLainnya.balance,
			showPercentages,
			compareWithPrevious
		),
		// Total Assets
		getTotalAssetsRow(data, showPercentages, compareWithPrevious),
		// Liabilities and Equity Section
		[
			{
				text: 'PASIVA (LIABILITIES & EQUITY)',
				style: 'sectionHeader',
				colSpan: getColumnCount(showPercentages, compareWithPrevious),
				fillColor: '#f0f0f0'
			},
			...Array(getColumnCount(showPercentages, compareWithPrevious) - 1).fill({})
		],
		...pasivaRows,
		// Total Liabilities and Equity
		getTotalPasivaRow(data, showPercentages, compareWithPrevious)
	];

	const docDefinition: TDocumentDefinitions = {
		content: [
			{ text: 'Balance Sheet', style: 'header' },
			{
				text: `Period: ${dateRange.start} to ${dateRange.end}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: getColumnWidths(showPercentages, compareWithPrevious),
					body: body
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

	const endDate = new Date(dateRange.end);
	const month = endDate.getMonth();
	const year = endDate.getFullYear();

	const monthNames = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];
	const monthName = monthNames[month];
	const periodName = `${monthName}_${year}`;
	const filename = `Balance_Sheet_${periodName}.pdf`;
	pdfMake.createPdf(docDefinition).download(filename);
}

export async function exportBalanceSheetToExcel(
	data: BalanceSheetData,
	period: { month: number; year: number },
	showPercentages: boolean,
	compareWithPrevious: boolean
) {
	if (!browser) {
		console.warn('Excel export is only available in browser environment');
		return;
	}

	// Wait for XLSX to be loaded
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
	const ws: { [key: string]: any } = {};
	let rowIndex = 0;

	// Define styles
	const boldStyle = { font: { bold: true } };
	const rightAlignStyle = { alignment: { horizontal: 'right' } };
	const boldRightAlignStyle = { font: { bold: true }, alignment: { horizontal: 'right' } };
	const numberFormat = '#,##0;(#,##0);0';

	// Helper to add cell
	const addCell = (row: number, col: number, value: any, style?: any) => {
		const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
		const cell: { [key: string]: any } = { v: value };
		if (typeof value === 'number') {
			cell.t = 'n';
			cell.v = Math.round(value);
			cell.z = numberFormat;
		} else {
			cell.t = 's';
		}
		if (style) {
			cell.s = style;
		}
		ws[cellRef] = cell;
	};

	const monthNames = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];
	const monthName = monthNames[period.month - 1];

	// Add title and date range
	addCell(rowIndex, 0, 'Balance Sheet', boldStyle);
	rowIndex++;
	addCell(rowIndex, 0, `Periode: ${monthName} ${period.year}`, boldStyle);
	rowIndex += 2; // Empty row for spacing

	// Add headers
	addCell(rowIndex, 0, 'Account', boldStyle);
	addCell(rowIndex, 1, 'Balance', boldStyle);
	addCell(rowIndex, 2, 'Summary', boldStyle);
	rowIndex++;

	const indent = '    ';
	const subIndent = '      ';

	// Add Assets section
	addCell(rowIndex, 0, 'AKTIVA (ASSETS)', boldStyle);
	rowIndex++;

	// Current Assets
	addCell(rowIndex, 0, indent + 'Aktiva Lancar (Current Assets)');
	rowIndex++;
	data.aktivaLancar.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Aktiva Lancar', boldStyle);
	addCell(rowIndex, 2, data.totalAktivaLancar.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Fixed Assets
	addCell(rowIndex, 0, indent + 'Aktiva Tetap (Fixed Assets)');
	rowIndex++;
	data.aktivaTetap.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Aktiva Tetap', boldStyle);
	addCell(rowIndex, 2, data.totalAktivaTetap.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Akumulasi Penyusutan
	addCell(rowIndex, 0, indent + 'Akumulasi Penyusutan');
	rowIndex++;
	data.akumulasiPenyusutan.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Akumulasi Penyusutan', boldStyle);
	addCell(rowIndex, 2, data.totalAkumulasiPenyusutan.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Other Assets
	addCell(rowIndex, 0, indent + 'Aktiva Lainnya (Other Assets)');
	rowIndex++;
	data.aktivaLainnya.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Aktiva Lainnya', boldStyle);
	addCell(rowIndex, 2, data.totalAktivaLainnya.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Total Assets
	addCell(rowIndex, 0, 'Total Aktiva (Total Assets)', boldStyle);
	addCell(rowIndex, 2, data.totalAktiva.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Add Liabilities and Equity section
	addCell(rowIndex, 0, 'PASIVA (LIABILITIES & EQUITY)', boldStyle);
	rowIndex++;

	// Current Liabilities
	addCell(rowIndex, 0, indent + 'Hutang Lancar (Current Liabilities)');
	rowIndex++;
	data.hutangLancar.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Hutang Lancar', boldStyle);
	addCell(rowIndex, 2, data.totalHutangLancar.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Accrued Expenses
	addCell(rowIndex, 0, indent + 'Biaya Yang Masih Harus Dibayar');
	rowIndex++;
	data.biayaYMHDB.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Biaya Yang Masih Harus Dibayar', boldStyle);
	addCell(rowIndex, 2, data.totalBiayaYMHDB.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Accrued Taxes
	addCell(rowIndex, 0, indent + 'Pajak Yang Masih Harus Dibayar');
	rowIndex++;
	data.pajakYMHDB.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Pajak Yang Masih Harus Dibayar', boldStyle);
	addCell(rowIndex, 2, data.totalPajakYMHDB.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Long-term Liabilities
	addCell(rowIndex, 0, indent + 'Hutang Jangka Panjang (Long-term Liabilities)');
	rowIndex++;
	data.hutangJangkaPanjang.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Hutang Jangka Panjang', boldStyle);
	addCell(rowIndex, 2, data.totalHutangJangkaPanjang.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	// Equity
	addCell(rowIndex, 0, indent + 'Modal (Equity)');
	rowIndex++;
	data.modal.forEach((account) => {
		addCell(rowIndex, 0, subIndent + account.name);
		addCell(rowIndex, 1, account.balance, rightAlignStyle);
		rowIndex++;
	});
	addCell(rowIndex, 0, subIndent + 'Total Modal', boldStyle);
	addCell(rowIndex, 2, data.totalModal.balance, boldRightAlignStyle);
	rowIndex++;
	rowIndex++;

	addCell(rowIndex, 0, '    ' + 'Laba (Rugi) Berjalan');
	addCell(rowIndex, 2, data.netIncome, rightAlignStyle);
	rowIndex++;

	// Total Liabilities and Equity
	addCell(rowIndex, 0, 'Total Pasiva (Total Liabilities & Equity)', boldStyle);
	addCell(rowIndex, 2, data.totalPasiva.balance, boldRightAlignStyle);
	rowIndex++;

	// Set worksheet range
	const range = { s: { c: 0, r: 0 }, e: { c: 2, r: rowIndex } };
	ws['!ref'] = XLSX.utils.encode_range(range);

	// Set column widths
	ws['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }];

	// Create workbook and add worksheet
	XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');

	// Save the file
	const periodName = `${monthName}_${period.year}`;
	const filename = `Balance_Sheet_${periodName}.xlsx`;
	XLSX.writeFile(wb, filename);
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
	let count = 2; // Account and Balance
	if (showPercentages) count++;
	if (compareWithPrevious) {
		count += 2; // Previous Period and Change
		if (showPercentages) count++;
	}
	return count;
}

function getTableHeaders(showPercentages: boolean, compareWithPrevious: boolean): TableCell[] {
	const headers = [
		{ text: 'Account', bold: true },
		{ text: 'Balance', alignment: 'right', bold: true }
	];
	if (showPercentages) headers.push({ text: '% of Total', alignment: 'right', bold: true });
	if (compareWithPrevious) {
		headers.push({ text: 'Previous Period', alignment: 'right', bold: true });
		if (showPercentages) headers.push({ text: '% of Total', alignment: 'right', bold: true });
		headers.push({ text: 'Change', alignment: 'right', bold: true });
	}
	return headers;
}

function calculatePercentage(value: number, total: number): string {
	if (!total) return '0.00%';
	return ((value / total) * 100).toFixed(2) + '%';
}

function calculateChange(current: number, previous: number): { value: number; display: string } {
	const change = current - previous;
	const percentChange = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
	return {
		value: change,
		display: `${formatCurrency(change)} (${percentChange.toFixed(2)}%)`
	};
}

function formatForPdf(amount: number): string {
	if (amount === null || amount === undefined) return '-';
	const num = Number(amount);

	const formattedNum = new Intl.NumberFormat('id-ID', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(Math.abs(num));

	if (num < 0) {
		return `(${formattedNum})`;
	}

	return formattedNum;
}

function calculateChangeForPdf(
	current: number,
	previous: number
): { value: number; display: string } {
	const change = current - previous;
	const percentChange = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
	return {
		value: change,
		display: `${formatForPdf(change)} (${percentChange.toFixed(2)}%)`
	};
}

function getStandaloneRow(
	label: string,
	total: number,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: label, bold: true, margin: [10, 2, 0, 2] },
		{ text: formatForPdf(total), alignment: 'right', bold: true }
	];

	const colCount = getColumnCount(showPercentages, compareWithPrevious);
	while (row.length < colCount) {
		row.push({ text: '' });
	}
	return row;
}

function getSubTotalRow(
	label: string,
	total: number,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: label, bold: true, margin: [20, 0, 0, 0] },
		{ text: formatForPdf(total), alignment: 'right', bold: true }
	];

	const colCount = getColumnCount(showPercentages, compareWithPrevious);
	while (row.length < colCount) {
		row.push({ text: '' });
	}
	return row;
}

function getAssetRows(
	assets: AccountBalance[],
	data: BalanceSheetData,
	type: 'aktivaLancar' | 'aktivaTetap' | 'akumulasiPenyusutan' | 'aktivaLainnya',
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[][] {
	return assets.map((asset) => {
		const row: TableCell[] = [
			{ text: asset.name, margin: [20, 0, 0, 0] },
			{ text: formatForPdf(asset.balance || 0), alignment: 'right' }
		];

		if (showPercentages) {
			row.push({
				text: calculatePercentage(asset.balance || 0, data.totalAktiva.balance),
				alignment: 'right'
			});
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevAsset = data.previousPeriod[type]?.find((a) => a.id === asset.id);
			row.push({
				text: prevAsset ? formatForPdf(prevAsset.balance || 0) : '-',
				alignment: 'right'
			});

			if (showPercentages && prevAsset) {
				const prevTotal = data.previousPeriod[type].reduce((sum, a) => sum + (a.balance || 0), 0);
				row.push({
					text: calculatePercentage(prevAsset.balance || 0, prevTotal),
					alignment: 'right'
				});
			}

			if (prevAsset) {
				const change = calculateChangeForPdf(asset.balance || 0, prevAsset.balance || 0);
				row.push({
					text: change.display,
					alignment: 'right',
					fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
				});
			} else {
				row.push({ text: '-', alignment: 'right' });
			}
		}

		return row;
	});
}

function getLiabilityRows(
	liabilities: AccountBalance[],
	data: BalanceSheetData,
	type: 'hutangLancar' | 'hutangJangkaPanjang' | 'biayaYMHDB' | 'pajakYMHDB',
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[][] {
	return liabilities.map((liability) => {
		const row: TableCell[] = [
			{ text: liability.name, margin: [20, 0, 0, 0] },
			{ text: formatForPdf(liability.balance || 0), alignment: 'right' }
		];

		if (showPercentages) {
			row.push({
				text: calculatePercentage(liability.balance || 0, data.totalPasiva.balance),
				alignment: 'right'
			});
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevLiability = data.previousPeriod[type]?.find((l) => l.id === liability.id);
			row.push({
				text: prevLiability ? formatForPdf(prevLiability.balance || 0) : '-',
				alignment: 'right'
			});

			if (showPercentages && prevLiability) {
				const prevTotal = data.previousPeriod[type].reduce((sum, l) => sum + (l.balance || 0), 0);
				row.push({
					text: calculatePercentage(prevLiability.balance || 0, prevTotal),
					alignment: 'right'
				});
			}

			if (prevLiability) {
				const change = calculateChangeForPdf(liability.balance || 0, prevLiability.balance || 0);
				row.push({
					text: change.display,
					alignment: 'right',
					fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
				});
			} else {
				row.push({ text: '-', alignment: 'right' });
			}
		}

		return row;
	});
}

function getEquityRows(
	equity: AccountBalance[],
	data: BalanceSheetData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[][] {
	return equity.map((item) => {
		const row: TableCell[] = [
			{ text: item.name, margin: [20, 0, 0, 0] },
			{ text: formatForPdf(item.balance || 0), alignment: 'right' }
		];

		if (showPercentages) {
			row.push({
				text: calculatePercentage(item.balance || 0, data.totalPasiva.balance),
				alignment: 'right'
			});
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevEquity = data.previousPeriod.modal?.find((e) => e.id === item.id);
			row.push({
				text: prevEquity ? formatForPdf(prevEquity.balance || 0) : '-',
				alignment: 'right'
			});

			if (showPercentages && prevEquity) {
				const prevTotal = data.previousPeriod.modal.reduce((sum, e) => sum + (e.balance || 0), 0);
				row.push({
					text: calculatePercentage(prevEquity.balance || 0, prevTotal),
					alignment: 'right'
				});
			}

			if (prevEquity) {
				const change = calculateChangeForPdf(item.balance || 0, prevEquity.balance || 0);
				row.push({
					text: change.display,
					alignment: 'right',
					fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
				});
			} else {
				row.push({ text: '-', alignment: 'right' });
			}
		}

		return row;
	});
}

function getTotalAssetsRow(
	data: BalanceSheetData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: 'Total Aktiva (Total Assets)', style: 'total', bold: true },
		{ text: formatForPdf(data.totalAktiva.balance), alignment: 'right', style: 'total' }
	];

	if (showPercentages) {
		row.push({ text: '100%', alignment: 'right', style: 'total' });
	}

	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal = [
			...data.previousPeriod.aktivaLancar,
			...data.previousPeriod.aktivaTetap,
			...data.previousPeriod.aktivaLainnya
		].reduce((sum, a) => sum + (a.balance || 0), 0);

		row.push({ text: formatForPdf(prevTotal), alignment: 'right', style: 'total' });

		if (showPercentages) {
			row.push({ text: '100%', alignment: 'right', style: 'total' });
		}

		const change = calculateChangeForPdf(data.totalAktiva.balance, prevTotal);
		row.push({
			text: change.display,
			alignment: 'right',
			style: 'total',
			fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
		});
	}

	return row;
}

function getTotalPasivaRow(
	data: BalanceSheetData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: 'Total Pasiva (Total Liabilities & Equity)', style: 'total', bold: true },
		{ text: formatForPdf(data.totalPasiva.balance), alignment: 'right', style: 'total' }
	];

	if (showPercentages) {
		row.push({ text: '100%', alignment: 'right', style: 'total' });
	}

	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal = [
			...data.previousPeriod.hutangLancar,
			...data.previousPeriod.hutangJangkaPanjang,
			...data.previousPeriod.modal
		].reduce((sum, p) => sum + (p.balance || 0), 0);

		row.push({ text: formatForPdf(prevTotal), alignment: 'right', style: 'total' });

		if (showPercentages) {
			row.push({ text: '100%', alignment: 'right', style: 'total' });
		}

		const change = calculateChangeForPdf(data.totalPasiva.balance, prevTotal);
		row.push({
			text: change.display,
			alignment: 'right',
			style: 'total',
			fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
		});
	}

	return row;
}

function addAccountsToWorksheet(wsData: any[][], accounts: AccountBalance[]) {
	accounts.forEach((account) => {
		wsData.push([
			'      ' + account.name,
			{
				v: Math.round(account.balance || 0),
				t: 'n',
				s: { alignment: { horizontal: 'right' }, numFmt: '#,##0;"("#,##0")"' }
			},
			''
		]);
	});
}

function addTotalToWorksheet(wsData: any[][], label: string, total: number) {
	wsData.push([
		label,
		'',
		{
			v: Math.round(total),
			t: 'n',
			s: { font: { bold: true }, alignment: { horizontal: 'right' }, numFmt: '#,##0;"("#,##0")"' }
		}
	]);
}
