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

interface AccountBalanceData {
	accounts: {
		code: string;
		name: string;
		type: string;
		level: number;
		previousDebit: number;
		previousCredit: number;
		debit: number;
		credit: number;
		balance: number;
		isDebit: boolean;
	}[];
	totals: {
		debit: number;
		credit: number;
		previousDebit: number;
		previousCredit: number;
		balanceDebit: number;
		balanceCredit: number;
	};
	period: {
		year: number;
		month: number;
	};
}

// Helper untuk format angka dengan dua desimal, ribuan titik, desimal koma
function formatCurrency2(value: number) {
	return value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export async function exportAccountBalanceToPdf(
	data: AccountBalanceData,
	dateRange: { start: string; end: string }
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

	const now = new Date();
	const [year, month] = dateRange.start.split('-');
	const filename = `${year}_${month}-account-balance.pdf`;

	// Format period string
	const startDate = new Date(dateRange.start);
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
	const periodString = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

	const docDefinition: TDocumentDefinitions = {
		pageSize: 'A4',
		pageOrientation: 'landscape',
		pageMargins: [40, 60, 40, 60],
		content: [
			{ text: 'Account Balance', style: 'header' },
			{
				text: `Period: ${periodString}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: ['auto', '*', 60, 80, 80, 80, 80, 80, 80],
					body: [
						[
							{ text: 'Account', bold: true },
							{ text: 'Name', bold: true },
							{ text: 'Type', bold: true },
							{ text: 'Previous Debit', alignment: 'right', bold: true },
							{ text: 'Previous Credit', alignment: 'right', bold: true },
							{ text: 'Current Debit', alignment: 'right', bold: true },
							{ text: 'Current Credit', alignment: 'right', bold: true },
							{ text: 'Balance Debit', alignment: 'right', bold: true },
							{ text: 'Balance Credit', alignment: 'right', bold: true }
						],
						...data.accounts.map((account) => [
							{ text: account.code },
							{ text: account.name },
							{ text: account.type },
							{ text: formatForPdf(account.previousDebit), alignment: 'right' },
							{ text: formatForPdf(account.previousCredit), alignment: 'right' },
							{ text: formatForPdf(account.debit), alignment: 'right' },
							{ text: formatForPdf(account.credit), alignment: 'right' },
							{
								text: formatForPdf(account.isDebit ? account.balance : 0),
								alignment: 'right'
							},
							{
								text: formatForPdf(!account.isDebit ? account.balance : 0),
								alignment: 'right'
							}
						]),
						[
							{ text: 'Total', style: 'total', bold: true, colSpan: 3 },
							{},
							{},
							{
								text: formatForPdf(data.totals.previousDebit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatForPdf(data.totals.previousCredit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatForPdf(data.totals.debit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatForPdf(data.totals.credit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatForPdf(data.totals.balanceDebit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatForPdf(data.totals.balanceCredit),
								alignment: 'right',
								style: 'total',
								bold: true
							}
						]
					]
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
			total: {
				bold: true,
				fillColor: '#f0f0f0'
			}
		},
		defaultStyle: {
			fontSize: 8
		}
	};

	pdfMake.createPdf(docDefinition).download(filename);
}

export async function exportAccountBalanceToExcel(
	data: AccountBalanceData,
	dateRange: { start: string; end: string }
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
			cell.z = numberFormat;
		} else {
			cell.t = 's';
		}
		if (style) {
			cell.s = style;
		}
		ws[cellRef] = cell;
	};

	// --- Period Formatting ---
	const startDate = new Date(dateRange.start);
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
	const periodString = `(${monthNames[startDate.getMonth()]} ${startDate.getFullYear()})`;

	// --- Add content to worksheet ---
	// Add title and period
	addCell(rowIndex, 0, 'Account Balance', boldStyle);
	rowIndex++;
	addCell(rowIndex, 0, `Period: ${periodString}`);
	rowIndex++;
	rowIndex++; // Empty row

	// Add headers
	const headers = [
		'Account',
		'Name',
		'Type',
		'Previous Debit',
		'Previous Credit',
		'Current Debit',
		'Current Credit',
		'Balance Debit',
		'Balance Credit'
	];
	headers.forEach((header, i) => {
		const headerStyle = i > 2 ? boldRightAlignStyle : boldStyle;
		addCell(rowIndex, i, header, headerStyle);
	});
	rowIndex++;

	// Add account rows
	data.accounts.forEach((account) => {
		addCell(rowIndex, 0, account.code);
		addCell(rowIndex, 1, account.name);
		addCell(rowIndex, 2, account.type);
		addCell(rowIndex, 3, account.previousDebit || 0, rightAlignStyle);
		addCell(rowIndex, 4, account.previousCredit || 0, rightAlignStyle);
		addCell(rowIndex, 5, account.debit, rightAlignStyle);
		addCell(rowIndex, 6, account.credit, rightAlignStyle);
		addCell(rowIndex, 7, account.isDebit ? account.balance || 0 : 0, rightAlignStyle);
		addCell(rowIndex, 8, !account.isDebit ? account.balance || 0 : 0, rightAlignStyle);
		rowIndex++;
	});

	// Add total row
	addCell(rowIndex, 0, 'Total', boldStyle);
	addCell(rowIndex, 1, '', boldStyle); // Empty cell
	addCell(rowIndex, 2, '', boldStyle); // Empty cell
	addCell(rowIndex, 3, data.totals.previousDebit || 0, boldRightAlignStyle);
	addCell(rowIndex, 4, data.totals.previousCredit || 0, boldRightAlignStyle);
	addCell(rowIndex, 5, data.totals.debit, boldRightAlignStyle);
	addCell(rowIndex, 6, data.totals.credit, boldRightAlignStyle);
	addCell(rowIndex, 7, data.totals.balanceDebit || 0, boldRightAlignStyle);
	addCell(rowIndex, 8, data.totals.balanceCredit || 0, boldRightAlignStyle);
	rowIndex++;

	// Set worksheet range and column widths
	const range = { s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: rowIndex } };
	ws['!ref'] = XLSX.utils.encode_range(range);
	ws['!cols'] = [
		{ wch: 15 },
		{ wch: 40 },
		{ wch: 15 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 18 }
	];

	// Create workbook and add worksheet
	XLSX.utils.book_append_sheet(wb, ws, 'Account Balance');

	// Generate filename
	const [year, month] = dateRange.start.split('-');
	const filename = `${year}_${month}-account-balance.xlsx`;

	// Save the file
	XLSX.writeFile(wb, filename);
}
