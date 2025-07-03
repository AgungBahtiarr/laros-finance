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

export async function exportAccountBalanceToPdf(data: AccountBalanceData, dateRange: { start: string; end: string }) {
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
	const printedAt = `Printed at: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
	const [year, month] = dateRange.start.split('-');
	const filename = `${year}_${month}-account-balance.pdf`;

	const docDefinition: TDocumentDefinitions = {
		content: [
			{ text: 'Account Balance', style: 'header' },
			{ text: printedAt, style: 'printedAt', margin: [0, 0, 0, 5] },
			{
				text: `Period: ${dateRange.start} to ${dateRange.end}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 90],
					body: [
						[
							{ text: 'Account', bold: true },
							{ text: 'Type', bold: true },
							{ text: 'Previous Debit', alignment: 'right', bold: true },
							{ text: 'Previous Credit', alignment: 'right', bold: true },
							{ text: 'Current Debit', alignment: 'right', bold: true },
							{ text: 'Current Credit', alignment: 'right', bold: true },
							{ text: 'Balance Debit', alignment: 'right', bold: true },
							{ text: 'Balance Credit', alignment: 'right', bold: true }
						],
						...data.accounts.map((account) => [
							{ text: `${account.code} - ${account.name}` },
							{ text: account.type },
							{ text: formatCurrency2(account.previousDebit), alignment: 'right' },
							{ text: formatCurrency2(account.previousCredit), alignment: 'right' },
							{ text: formatCurrency2(account.debit), alignment: 'right' },
							{ text: formatCurrency2(account.credit), alignment: 'right' },
							{ text: formatCurrency2(account.isDebit ? account.balance : 0), alignment: 'right', fillColor: account.isDebit ? '#e6ffe6' : undefined },
							{ text: formatCurrency2(!account.isDebit ? account.balance : 0), alignment: 'right', fillColor: !account.isDebit ? '#ffe6e6' : undefined }
						]),
						[
							{ text: 'Total', style: 'total', bold: true },
							{},
							{ text: formatCurrency2(data.totals.previousDebit), alignment: 'right', style: 'total', bold: true },
							{ text: formatCurrency2(data.totals.previousCredit), alignment: 'right', style: 'total', bold: true },
							{ text: formatCurrency2(data.totals.debit), alignment: 'right', style: 'total', bold: true },
							{ text: formatCurrency2(data.totals.credit), alignment: 'right', style: 'total', bold: true },
							{ text: formatCurrency2(data.totals.balanceDebit), alignment: 'right', style: 'total', bold: true },
							{ text: formatCurrency2(data.totals.balanceCredit), alignment: 'right', style: 'total', bold: true }
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

	pdfMake.createPdf(docDefinition).download(filename);
}

export async function exportAccountBalanceToExcel(data: AccountBalanceData, dateRange: { start: string; end: string }) {
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

	const now = new Date();
	const printedAt = `Printed at: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
	const [year, month] = dateRange.start.split('-');
	const filename = `${year}_${month}-account-balance.xlsx`;

	const wsData = [];
	wsData.push(['Account Balance']);
	wsData.push([printedAt]);
	wsData.push([`Period: ${dateRange.start} to ${dateRange.end}`]);
	wsData.push([]);
	wsData.push([
		'Account',
		'Type',
		'Previous Debit',
		'Previous Credit',
		'Current Debit',
		'Current Credit',
		'Balance Debit',
		'Balance Credit'
	]);
	data.accounts.forEach((account) => {
		wsData.push([
			`${account.code} - ${account.name}`,
			account.type,
			formatCurrency2(account.previousDebit),
			formatCurrency2(account.previousCredit),
			formatCurrency2(account.debit),
			formatCurrency2(account.credit),
			formatCurrency2(account.isDebit ? account.balance : 0),
			formatCurrency2(!account.isDebit ? account.balance : 0)
		]);
	});
	wsData.push([
		'Total',
		'',
		formatCurrency2(data.totals.previousDebit),
		formatCurrency2(data.totals.previousCredit),
		formatCurrency2(data.totals.debit),
		formatCurrency2(data.totals.credit),
		formatCurrency2(data.totals.balanceDebit),
		formatCurrency2(data.totals.balanceCredit)
	]);

	const ws = XLSX.utils.aoa_to_sheet(wsData);
	ws['!cols'] = [
		{ wch: 40 }, // Account name
		{ wch: 15 }, // Type
		{ wch: 15 }, // Previous Debit
		{ wch: 15 }, // Previous Credit
		{ wch: 15 }, // Current Debit
		{ wch: 15 }, // Current Credit
		{ wch: 15 }, // Balance Debit
		{ wch: 15 } // Balance Credit
	];

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Account Balance');
	XLSX.writeFile(wb, filename);
}
