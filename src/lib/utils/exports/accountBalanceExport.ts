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

interface AccountBalanceData {
	accounts: {
		code: string;
		name: string;
		debit: number;
		credit: number;
		debitMovement: number;
		creditMovement: number;
		finalDebit: number;
		finalCredit: number;
	}[];
	totals: {
		debit: number;
		credit: number;
		debitMovement: number;
		creditMovement: number;
		finalDebit: number;
		finalCredit: number;
	};
	period: {
		year: number;
		month: number;
	};
}

export async function exportAccountBalanceToPdf(data: AccountBalanceData) {
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
			{ text: 'Account Balance', style: 'header' },
			{
				text: `Year: ${data.period.year}`,
				style: 'subheader',
				margin: [0, 0, 0, 5]
			},
			{
				text: `Month: ${data.period.month}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
					body: [
						// Headers
						[
							{ text: 'Account', bold: true },
							{ text: 'Name', bold: true },
							{ text: 'Debit', alignment: 'right', bold: true },
							{ text: 'Credit', alignment: 'right', bold: true },
							{ text: 'Debit', alignment: 'right', bold: true },
							{ text: 'Credit', alignment: 'right', bold: true },
							{ text: 'Debit', alignment: 'right', bold: true },
							{ text: 'Credit', alignment: 'right', bold: true }
						],
						// Account rows
						...data.accounts.map((account) => [
							{ text: account.code },
							{ text: account.name },
							{ text: formatCurrency(account.debit), alignment: 'right' },
							{ text: formatCurrency(account.credit), alignment: 'right' },
							{ text: formatCurrency(account.debitMovement), alignment: 'right' },
							{ text: formatCurrency(account.creditMovement), alignment: 'right' },
							{ text: formatCurrency(account.finalDebit), alignment: 'right' },
							{ text: formatCurrency(account.finalCredit), alignment: 'right' }
						]),
						// Total row
						[
							{ text: 'TOTAL', colSpan: 2, bold: true },
							{},
							{
								text: formatCurrency(data.totals.debit),
								alignment: 'right',
								bold: true
							},
							{
								text: formatCurrency(data.totals.credit),
								alignment: 'right',
								bold: true
							},
							{
								text: formatCurrency(data.totals.debitMovement),
								alignment: 'right',
								bold: true
							},
							{
								text: formatCurrency(data.totals.creditMovement),
								alignment: 'right',
								bold: true
							},
							{
								text: formatCurrency(data.totals.finalDebit),
								alignment: 'right',
								bold: true
							},
							{
								text: formatCurrency(data.totals.finalCredit),
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
			fontSize: 10
		}
	};

	pdfMake.createPdf(docDefinition).download('account-balance.pdf');
}

export async function exportAccountBalanceToExcel(data: AccountBalanceData) {
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

	// Add title and period
	wsData.push(['Account Balance']);
	wsData.push([`Year: ${data.period.year}`]);
	wsData.push([`Month: ${data.period.month}`]);
	wsData.push([]); // Empty row for spacing

	// Add headers
	wsData.push(['Account', 'Name', 'Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit']);

	// Add account rows
	data.accounts.forEach((account) => {
		wsData.push([
			account.code,
			account.name,
			account.debit,
			account.credit,
			account.debitMovement,
			account.creditMovement,
			account.finalDebit,
			account.finalCredit
		]);
	});

	// Add total row
	wsData.push([
		'TOTAL',
		'',
		data.totals.debit,
		data.totals.credit,
		data.totals.debitMovement,
		data.totals.creditMovement,
		data.totals.finalDebit,
		data.totals.finalCredit
	]);

	// Create worksheet
	const ws = XLSX.utils.aoa_to_sheet(wsData);

	// Set column widths
	ws['!cols'] = [
		{ wch: 15 }, // Account code
		{ wch: 40 }, // Account name
		{ wch: 15 }, // Debit
		{ wch: 15 }, // Credit
		{ wch: 15 }, // Debit Movement
		{ wch: 15 }, // Credit Movement
		{ wch: 15 }, // Final Debit
		{ wch: 15 } // Final Credit
	];

	// Create workbook and add worksheet
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Account Balance');

	// Save the file
	XLSX.writeFile(wb, 'account-balance.xlsx');
}
