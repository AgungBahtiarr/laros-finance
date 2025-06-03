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
}

interface TrialBalanceData {
	accounts: AccountBalance[];
	totals: {
		debit: number;
		credit: number;
		previousDebit?: number;
		previousCredit?: number;
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

	const docDefinition: TDocumentDefinitions = {
		content: [
			{ text: 'Trial Balance', style: 'header' },
			{
				text: `Period: ${dateRange.start} to ${dateRange.end}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
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
						...data.accounts.map((account) => {
							const previousBalance = (account.previousDebit || 0) - (account.previousCredit || 0);
							const currentBalance = account.debit - account.credit;
							const finalBalance = previousBalance - currentBalance;

							return [
								{ text: `${account.code} - ${account.name}` },
								{ text: formatCurrency(account.previousDebit || 0), alignment: 'right' },
								{ text: formatCurrency(account.previousCredit || 0), alignment: 'right' },
								{ text: formatCurrency(account.debit), alignment: 'right' },
								{ text: formatCurrency(account.credit), alignment: 'right' },
								{
									text: formatCurrency(finalBalance > 0 ? Math.abs(finalBalance) : 0),
									alignment: 'right',
									fillColor: finalBalance > 0 ? '#e6ffe6' : undefined
								},
								{
									text: formatCurrency(finalBalance < 0 ? Math.abs(finalBalance) : 0),
									alignment: 'right',
									fillColor: finalBalance < 0 ? '#ffe6e6' : undefined
								}
							];
						}),
						// Total row
						[
							{ text: 'Total', style: 'total', bold: true },
							{
								text: formatCurrency(data.totals.previousDebit || 0),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency(data.totals.previousCredit || 0),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency(data.totals.debit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency(data.totals.credit),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency(
									Math.max(0, (data.totals.previousDebit || 0) - data.totals.debit)
								),
								alignment: 'right',
								style: 'total',
								bold: true
							},
							{
								text: formatCurrency(
									Math.max(0, (data.totals.previousCredit || 0) - data.totals.credit)
								),
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
			fontSize: 10
		}
	};

	pdfMake.createPdf(docDefinition).download('trial-balance.pdf');
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

	// Prepare the worksheet data
	const wsData = [];

	// Add title and date range
	wsData.push(['Trial Balance']);
	wsData.push([`Period: ${dateRange.start} to ${dateRange.end}`]);
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
		const previousBalance = (account.previousDebit || 0) - (account.previousCredit || 0);
		const currentBalance = account.debit - account.credit;
		const finalBalance = previousBalance - currentBalance;

		wsData.push([
			`${account.code} - ${account.name}`,
			account.previousDebit || 0,
			account.previousCredit || 0,
			account.debit,
			account.credit,
			finalBalance > 0 ? Math.abs(finalBalance) : 0,
			finalBalance < 0 ? Math.abs(finalBalance) : 0
		]);
	});

	// Add total row
	wsData.push([
		'Total',
		data.totals.previousDebit || 0,
		data.totals.previousCredit || 0,
		data.totals.debit,
		data.totals.credit,
		Math.max(0, (data.totals.previousDebit || 0) - data.totals.debit),
		Math.max(0, (data.totals.previousCredit || 0) - data.totals.credit)
	]);

	// Create worksheet
	const ws = XLSX.utils.aoa_to_sheet(wsData);

	// Add styling
	const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
	const maxCol = range.e.c;

	// Set column widths
	ws['!cols'] = [
		{ wch: 40 }, // Account name
		{ wch: 15 }, // Previous Debit
		{ wch: 15 }, // Previous Credit
		{ wch: 15 }, // Current Debit
		{ wch: 15 }, // Current Credit
		{ wch: 15 }, // Balance Debit
		{ wch: 15 } // Balance Credit
	];

	// Create workbook and add worksheet
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');

	// Save the file
	XLSX.writeFile(wb, 'trial-balance.xlsx');
}
