import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type * as pdfMakeType from 'pdfmake/build/pdfmake';
import type { WorkBook } from 'xlsx';
import { formatCurrency } from '../utils.client';
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
	id: string;
	code: string;
	name: string;
	type: string;
	debit: number;
	credit: number;
	previousDebit?: number;
	previousCredit?: number;
	balance?: number;
	isDebit: boolean;
}

interface TrialBalanceData {
	accounts: AccountBalance[];
	totals: {
		debit: number;
		credit: number;
		previousDebit?: number;
		previousCredit?: number;
		balanceDebit?: number;
		balanceCredit?: number;
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

// Helper untuk format angka dengan dua desimal, ribuan titik, desimal koma
function formatCurrency2(value: number) {
	return value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function exportTrialBalanceToPdf(
	data: TrialBalanceData,
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

	// Tambahkan tanggal sekarang
	const now = new Date();
	const printedAt = `Printed at: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

	// Format proper date range
	const startDate = new Date(dateRange.start);
	const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of the month
	const formattedDateRange = `${startDate.toLocaleDateString('id-ID')} to ${endDate.toLocaleDateString('id-ID')}`;

	const docDefinition: TDocumentDefinitions = {
		pageSize: 'A4',
		pageOrientation: 'landscape',
		pageMargins: [40, 60, 40, 60],
		content: [
			{ text: 'Trial Balance', style: 'header' },
			{ text: printedAt, style: 'printedAt', margin: [0, 0, 0, 5] },
			{
				text: `Period: ${formattedDateRange}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: ['*', 80, 80, 80, 80, 80, 80],
					body: [
						// Headers
						[
							{ text: 'Account', bold: true },
							{ text: 'Previous Debit', alignment: 'right', bold: true },
							{ text: 'Previous Credit', alignment: 'right', bold: true },
							{ text: 'Current Debit', alignment: 'right', bold: true },
							{ text: 'Current Credit', alignment: 'right', bold: true },
							{ text: 'Balance Debit', alignment: 'right', bold: true },
							{ text: 'Balance Credit', alignment: 'right', bold: true }
						],
						// Account rows
						...data.accounts.map((account) => [
							{ text: `${account.code} - ${account.name}` },
							{ text: formatCurrency2(account.previousDebit || 0), alignment: 'right' },
							{ text: formatCurrency2(account.previousCredit || 0), alignment: 'right' },
							{ text: formatCurrency2(account.debit), alignment: 'right' },
							{ text: formatCurrency2(account.credit), alignment: 'right' },
							{
								text: formatCurrency2(account.isDebit ? account.balance || 0 : 0),
								alignment: 'right',
								fillColor: account.isDebit ? '#e6ffe6' : undefined
							},
							{
								text: formatCurrency2(!account.isDebit ? account.balance || 0 : 0),
								alignment: 'right',
								fillColor: !account.isDebit ? '#ffe6e6' : undefined
							}
						]),
						// Total row
						[
							{ text: 'Total', style: 'total', bold: true },
							{
								text: formatCurrency2(data.totals.previousDebit || 0),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency2(data.totals.previousCredit || 0),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency2(data.totals.debit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency2(data.totals.credit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency2(data.totals.balanceDebit || 0),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency2(data.totals.balanceCredit || 0),
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
			},
			printedAt: {
				fontSize: 10,
				italics: true,
				color: '#888888'
			}
		},
		defaultStyle: {
			fontSize: 10
		}
	};

	// Generate filename: tahun_bulan-trial-balance.pdf
	const [year, month] = dateRange.start.split('-');
	const filename = `${year}_${month}-trial-balance.pdf`;

	pdfMake.createPdf(docDefinition).download(filename);
}

export async function exportTrialBalanceToExcel(
	data: TrialBalanceData,
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

	// Tambahkan tanggal sekarang
	const now = new Date();
	const printedAt = `Printed at: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

	// Prepare the worksheet data
	const wsData = [];

	// Format proper date range
	const startDate = new Date(dateRange.start);
	const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of the month
	const formattedDateRange = `${startDate.toLocaleDateString('id-ID')} to ${endDate.toLocaleDateString('id-ID')}`;

	// Add title, printed at, and date range
	wsData.push(['Trial Balance']);
	wsData.push([printedAt]);
	wsData.push([`Period: ${formattedDateRange}`]);
	wsData.push([]); // Empty row for spacing

	// Add headers
	wsData.push([
		'Account',
		'Previous Debit',
		'Previous Credit',
		'Current Debit',
		'Current Credit',
		'Balance Debit',
		'Balance Credit'
	]);

	// Add account rows
	data.accounts.forEach((account) => {
		wsData.push([
			`${account.code} - ${account.name}`,
			formatCurrency2(account.previousDebit || 0),
			formatCurrency2(account.previousCredit || 0),
			formatCurrency2(account.debit),
			formatCurrency2(account.credit),
			formatCurrency2(account.isDebit ? account.balance || 0 : 0),
			formatCurrency2(!account.isDebit ? account.balance || 0 : 0)
		]);
	});

	// Add total row
	wsData.push([
		'Total',
		formatCurrency2(data.totals.previousDebit || 0),
		formatCurrency2(data.totals.previousCredit || 0),
		formatCurrency2(data.totals.debit),
		formatCurrency2(data.totals.credit),
		formatCurrency2(data.totals.balanceDebit || 0),
		formatCurrency2(data.totals.balanceCredit || 0)
	]);

	// Create worksheet
	const ws = XLSX.utils.aoa_to_sheet(wsData);

	// Add styling
	const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
	const maxCol = range.e.c;

	// Set column widths
	ws['!cols'] = [
		{ wch: 50 }, // Account name
		{ wch: 18 }, // Previous Debit
		{ wch: 18 }, // Previous Credit
		{ wch: 18 }, // Current Debit
		{ wch: 18 }, // Current Credit
		{ wch: 18 }, // Balance Debit
		{ wch: 18 } // Balance Credit
	];

	// Create workbook and add worksheet
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');

	// Generate filename: tahun_bulan-trial-balance.xlsx
	const [year, month] = dateRange.start.split('-');
	const filename = `${year}_${month}-trial-balance.xlsx`;

	// Save the file
	XLSX.writeFile(wb, filename);
}
