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

interface GLSummaryAccount {
	accountId: number;
	accountCode: string;
	accountName: string;
	beginningBalance: number;
	changeDebit: number;
	changeCredit: number;
	netChange: number;
	endingBalance: number;
}

interface GLSummaryData {
	summaryData: GLSummaryAccount[];
	totals: {
		beginningBalance: number;
		changeDebit: number;
		changeCredit: number;
		netChange: number;
		endingBalance: number;
	};
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

export async function exportGLSummaryToPdf(
	data: GLSummaryData,
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

	const docDefinition: TDocumentDefinitions = {
		pageOrientation: 'landscape',
		content: [
			{ text: 'General Ledger Summary', style: 'header' },
			{
				text: `From: ${dateRange.start}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				text: `To: ${dateRange.end}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
					body: [
						// Headers
						[
							{ text: 'Account Code', bold: true },
							{ text: 'Account Name', bold: true },
							{ text: 'Beginning Balance', alignment: 'right', bold: true },
							{ text: 'Change Debit', alignment: 'right', bold: true },
							{ text: 'Change Credit', alignment: 'right', bold: true },
							{ text: 'Net Change', alignment: 'right', bold: true },
							{ text: 'Ending Balance', alignment: 'right', bold: true }
						],
						// Account rows
						...data.summaryData.map((account) => [
							{ text: account.accountCode },
							{ text: account.accountName },
							{ text: formatForPdf(account.beginningBalance), alignment: 'right' },
							{ text: formatForPdf(account.changeDebit), alignment: 'right' },
							{ text: formatForPdf(account.changeCredit), alignment: 'right' },
							{
								text: formatForPdf(account.netChange),
								alignment: 'right'
							},
							{ text: formatForPdf(account.endingBalance), alignment: 'right' }
						]),
						// Total row
						[
							{ text: 'Total', colSpan: 2, bold: true },
							{},
							{
								text: formatForPdf(data.totals.beginningBalance),
								alignment: 'right',
								bold: true
							},
							{
								text: formatForPdf(data.totals.changeDebit),
								alignment: 'right',
								bold: true
							},
							{
								text: formatForPdf(data.totals.changeCredit),
								alignment: 'right',
								bold: true
							},
							{
								text: formatForPdf(data.totals.netChange),
								alignment: 'right',
								bold: true
							},
							{
								text: formatForPdf(data.totals.endingBalance),
								alignment: 'right',
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
			}
		},
		defaultStyle: {
			fontSize: 8
		}
	};

	pdfMake.createPdf(docDefinition).download('gl-summary.pdf');
}

export async function exportGLSummaryToExcel(
	data: GLSummaryData,
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

	// Prepare the worksheet data
	const wsData = [];

	// Add title and date range
	wsData.push(['General Ledger Summary']);
	wsData.push([`From: ${dateRange.start}`]);
	wsData.push([`To: ${dateRange.end}`]);
	wsData.push([]); // Empty row for spacing

	// Add headers
	wsData.push([
		'Account Code',
		'Account Name',
		'Beginning Balance',
		'Change Debit',
		'Change Credit',
		'Net Change',
		'Ending Balance'
	]);

	// Add account rows
	data.summaryData.forEach((account) => {
		wsData.push([
			account.accountCode,
			account.accountName,
			account.beginningBalance,
			account.changeDebit,
			account.changeCredit,
			account.netChange,
			account.endingBalance
		]);
	});

	// Add total row
	wsData.push([
		'Total',
		'',
		data.totals.beginningBalance,
		data.totals.changeDebit,
		data.totals.changeCredit,
		data.totals.netChange,
		data.totals.endingBalance
	]);

	// Create worksheet
	const ws = XLSX.utils.aoa_to_sheet(wsData);

	// Set column widths
	ws['!cols'] = [
		{ wch: 15 }, // Account Code
		{ wch: 40 }, // Account Name
		{ wch: 15 }, // Beginning Balance
		{ wch: 15 }, // Change Debit
		{ wch: 15 }, // Change Credit
		{ wch: 15 }, // Net Change
		{ wch: 15 } // Ending Balance
	];

	// Create workbook and add worksheet
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'GL Summary');

	// Save the file
	XLSX.writeFile(wb, 'gl-summary.xlsx');
}