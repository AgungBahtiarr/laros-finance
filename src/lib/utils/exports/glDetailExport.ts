import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type * as pdfMakeType from 'pdfmake/build/pdfmake';
import type { WorkBook } from 'xlsx';
import { formatCurrency, formatDate } from '../utils.client';
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

interface GLDetailAccount {
	accountId: number;
	accountCode: string;
	accountName: string;
	date: string;
	journalNumber: string;
	reffNumber: string;
	note: string;
	detailNote: string;
	openingBalance: number;
	debit: number;
	credit: number;
	balance: number;
}

interface GLDetailData {
	detailData: GLDetailAccount[];
	totals?: {
		openingBalance: number;
		debit: number;
		credit: number;
		balance: number;
	};
	selectedAccounts?: number[];
}

export async function exportGLDetailToPdf(
	data: GLDetailData,
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

	// Group by account
	const accountGroups = data.detailData.reduce((groups, row) => {
		const accountKey = `${row.accountCode}-${row.accountId}`;
		if (!groups[accountKey]) {
			groups[accountKey] = {
				accountCode: row.accountCode,
				accountName: row.accountName,
				transactions: []
			};
		}
		groups[accountKey].transactions.push(row);
		return groups;
	}, {});

	// Calculate totals if not provided
	const totals =
		data.totals ||
		data.detailData.reduce(
			(totals, row) => ({
				openingBalance: totals.openingBalance + row.openingBalance,
				debit: totals.debit + row.debit,
				credit: totals.credit + row.credit,
				balance: totals.balance + row.balance
			}),
			{ openingBalance: 0, debit: 0, credit: 0, balance: 0 }
		);

	// Create content for each account group
	const content = [
		{ text: 'General Ledger Detail', style: 'header' },
		{
			text: `From: ${dateRange.start}`,
			style: 'subheader',
			margin: [0, 0, 0, 10]
		},
		{
			text: `To: ${dateRange.end}`,
			style: 'subheader',
			margin: [0, 0, 0, 10]
		}
	];

	// Add account sections
	Object.values(accountGroups).forEach((group: any) => {
		content.push({
			text: `${group.accountCode} - ${group.accountName}`,
			style: 'accountHeader',
			margin: [0, 10, 0, 5]
		});

		// Add account transactions table
		content.push({
			table: {
				headerRows: 1,
				widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
				body: [
					// Headers
					[
						{ text: 'Date', bold: true },
						{ text: 'Description', bold: true },
						{ text: 'Ref', bold: true },
						{ text: 'Debit', alignment: 'right', bold: true },
						{ text: 'Credit', alignment: 'right', bold: true },
						{ text: 'Balance', alignment: 'right', bold: true }
					],
					// Opening balance row
					[
						{ text: formatDate(group.transactions[0].date), style: 'openingBalance' },
						{ text: 'Opening Balance', style: 'openingBalance' },
						{ text: '', style: 'openingBalance' },
						{ text: '', style: 'openingBalance' },
						{ text: '', style: 'openingBalance' },
						{
							text: formatCurrency(group.transactions[0].openingBalance),
							alignment: 'right',
							style: 'openingBalance'
						}
					],
					// Transaction rows
					...group.transactions.map((row) => [
						{ text: formatDate(row.date) },
						{ text: `${row.journalNumber}${row.detailNote ? ' - ' + row.detailNote : ''}` },
						{ text: row.reffNumber || '' },
						{ text: formatCurrency(row.debit), alignment: 'right' },
						{ text: formatCurrency(row.credit), alignment: 'right' },
						{
							text: formatCurrency(row.balance),
							alignment: 'right',
							fillColor: row.balance > 0 ? '#e6ffe6' : row.balance < 0 ? '#ffe6e6' : undefined
						}
					]),
					// Account subtotal
					[
						{ text: 'Subtotal', colSpan: 3, bold: true },
						{},
						{},
						{
							text: formatCurrency(group.transactions.reduce((sum, row) => sum + row.debit, 0)),
							alignment: 'right',
							bold: true
						},
						{
							text: formatCurrency(group.transactions.reduce((sum, row) => sum + row.credit, 0)),
							alignment: 'right',
							bold: true
						},
						{
							text: formatCurrency(group.transactions[group.transactions.length - 1].balance),
							alignment: 'right',
							bold: true,
							fillColor:
								group.transactions[group.transactions.length - 1].balance > 0
									? '#e6ffe6'
									: group.transactions[group.transactions.length - 1].balance < 0
										? '#ffe6e6'
										: undefined
						}
					]
				]
			},
			layout: {
				fillColor: function (rowIndex, node, columnIndex) {
					return rowIndex === 1 ? '#f9f9f9' : null;
				}
			}
		});
	});

	// Add grand total
	content.push({
		table: {
			headerRows: 0,
			widths: ['*', 'auto', 'auto', 'auto'],
			body: [
				[
					{ text: 'Grand Total', bold: true },
					{
						text: formatCurrency(totals.debit),
						alignment: 'right',
						bold: true
					},
					{
						text: formatCurrency(totals.credit),
						alignment: 'right',
						bold: true
					},
					{
						text: formatCurrency(totals.balance),
						alignment: 'right',
						bold: true,
						fillColor: totals.balance > 0 ? '#e6ffe6' : totals.balance < 0 ? '#ffe6e6' : undefined
					}
				]
			]
		},
		margin: [0, 15, 0, 0]
	});

	const docDefinition: TDocumentDefinitions = {
		content,
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
			accountHeader: {
				fontSize: 12,
				bold: true,
				margin: [0, 10, 0, 5]
			},
			openingBalance: {
				fillColor: '#f9f9f9',
				italics: true
			}
		},
		defaultStyle: {
			fontSize: 10
		}
	};

	pdfMake.createPdf(docDefinition).download('gl-detail.pdf');
}

export async function exportGLDetailToExcel(
	data: GLDetailData,
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

	// Group by account
	const accountGroups = data.detailData.reduce((groups, row) => {
		const accountKey = `${row.accountCode}-${row.accountId}`;
		if (!groups[accountKey]) {
			groups[accountKey] = {
				accountCode: row.accountCode,
				accountName: row.accountName,
				transactions: []
			};
		}
		groups[accountKey].transactions.push(row);
		return groups;
	}, {});

	// Prepare the worksheet data
	const wsData = [];

	// Add title and date range
	wsData.push(['General Ledger Detail']);
	wsData.push([`From: ${dateRange.start}`]);
	wsData.push([`To: ${dateRange.end}`]);
	wsData.push([]); // Empty row for spacing

	// Add account sections
	Object.values(accountGroups).forEach((group: any) => {
		// Add account header
		wsData.push([`${group.accountCode} - ${group.accountName}`]);

		// Add transaction headers
		wsData.push([
			'Date',
			'Journal Number',
			'Description',
			'Reference',
			'Debit',
			'Credit',
			'Balance'
		]);

		// Add opening balance
		wsData.push([
			formatDate(group.transactions[0].date),
			'',
			'Opening Balance',
			'',
			'',
			'',
			group.transactions[0].openingBalance
		]);

		// Add transactions
		group.transactions.forEach((row) => {
			wsData.push([
				formatDate(row.date),
				row.journalNumber,
				row.detailNote || row.note,
				row.reffNumber,
				row.debit,
				row.credit,
				row.balance
			]);
		});

		// Add account subtotal
		wsData.push([
			'Subtotal',
			'',
			'',
			'',
			group.transactions.reduce((sum, row) => sum + row.debit, 0),
			group.transactions.reduce((sum, row) => sum + row.credit, 0),
			group.transactions[group.transactions.length - 1].balance
		]);

		// Add empty row between accounts
		wsData.push([]);
	});

	// Add grand total
	const totals =
		data.totals ||
		data.detailData.reduce(
			(totals, row) => ({
				openingBalance: totals.openingBalance + row.openingBalance,
				debit: totals.debit + row.debit,
				credit: totals.credit + row.credit,
				balance: totals.balance + row.balance
			}),
			{ openingBalance: 0, debit: 0, credit: 0, balance: 0 }
		);

	wsData.push(['Grand Total', '', '', '', totals.debit, totals.credit, totals.balance]);

	// Create worksheet
	const ws = XLSX.utils.aoa_to_sheet(wsData);

	// Set column widths
	ws['!cols'] = [
		{ wch: 12 }, // Date
		{ wch: 15 }, // Journal Number
		{ wch: 40 }, // Description
		{ wch: 15 }, // Reference
		{ wch: 15 }, // Debit
		{ wch: 15 }, // Credit
		{ wch: 15 } // Balance
	];

	// Create workbook and add worksheet
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'GL Detail');

	// Save the file
	XLSX.writeFile(wb, 'gl-detail.xlsx');
}
