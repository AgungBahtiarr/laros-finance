import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type * as pdfMakeType from 'pdfmake/build/pdfmake';
import type { WorkBook, WorkSheet } from 'xlsx';
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

	const fixedNum = num.toFixed(2);
    const parts = fixedNum.split('.');
    const integerPart = parseInt(parts[0], 10);
    const decimalPart = parts[1];

    const formattedInteger = new Intl.NumberFormat('id-ID').format(Math.abs(integerPart));

    const result = `${formattedInteger},${decimalPart}`;

	if (num < 0) {
		return `(${result})`;
	}
	return result;
}

function formatDateForFilename(dateString: string): string {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
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
								text: '',
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
								text: '',
								alignment: 'right',
								bold: true
							},
							{
								text: '',
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

    const formattedStartDate = formatDateForFilename(dateRange.start);
    const formattedEndDate = formatDateForFilename(dateRange.end);
    const filename = `gl-summary_${formattedStartDate}_to_${formattedEndDate}.pdf`;

	pdfMake.createPdf(docDefinition).download(filename);
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

	const ws: WorkSheet = {};
    let rowIndex = 0;

    const accountingFormat = '#,##0.00;(#,##0.00);0.00';

    // Helper to add cell
	const addCell = (row: number, col: number, value: any, style?: any) => {
		const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
		const cell: { [key: string]: any } = { v: value };
		if (typeof value === 'number') {
			cell.t = 'n';
			cell.z = accountingFormat;
		} else {
			cell.t = 's';
		}
		if (style) {
			cell.s = style;
		}
		ws[cellRef] = cell;
	};

    const boldStyle = { font: { bold: true } };

	// Add title and date range
    addCell(rowIndex, 0, 'General Ledger Summary', boldStyle);
    rowIndex++;
	addCell(rowIndex, 0, `From: ${dateRange.start}`);
    rowIndex++;
	addCell(rowIndex, 0, `To: ${dateRange.end}`);
	rowIndex += 2; // Empty row for spacing

	// Add headers
    const headers = [
		'Account Code',
		'Account Name',
		'Beginning Balance',
		'Change Debit',
		'Change Credit',
		'Net Change',
		'Ending Balance'
	];
    headers.forEach((header, i) => addCell(rowIndex, i, header, boldStyle));
    rowIndex++;


	// Add account rows
	data.summaryData.forEach((account) => {
        addCell(rowIndex, 0, account.accountCode);
        addCell(rowIndex, 1, account.accountName);
        addCell(rowIndex, 2, account.beginningBalance);
        addCell(rowIndex, 3, account.changeDebit);
        addCell(rowIndex, 4, account.changeCredit);
        addCell(rowIndex, 5, account.netChange);
        addCell(rowIndex, 6, account.endingBalance);
		rowIndex++;
	});

	// Add total row
    addCell(rowIndex, 0, 'Total', boldStyle);
    addCell(rowIndex, 1, '', boldStyle); // Empty cell
    addCell(rowIndex, 2, '', boldStyle);
    addCell(rowIndex, 3, data.totals.changeDebit, boldStyle);
    addCell(rowIndex, 4, data.totals.changeCredit, boldStyle);
    addCell(rowIndex, 5, '', boldStyle);
    addCell(rowIndex, 6, '', boldStyle);
    rowIndex++;

	// Set worksheet range
    const range = { s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: rowIndex } };
    ws['!ref'] = XLSX.utils.encode_range(range);

	// Set column widths
	ws['!cols'] = [
		{ wch: 15 }, // Account Code
		{ wch: 40 }, // Account Name
		{ wch: 20 }, // Beginning Balance
		{ wch: 20 }, // Change Debit
		{ wch: 20 }, // Change Credit
		{ wch: 20 }, // Net Change
		{ wch: 20 }  // Ending Balance
	];

	// Create workbook and add worksheet
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'GL Summary');

	// Save the file
    const formattedStartDate = formatDateForFilename(dateRange.start);
    const formattedEndDate = formatDateForFilename(dateRange.end);
    const filename = `gl-summary_${formattedStartDate}_to_${formattedEndDate}.xlsx`;
	XLSX.writeFile(wb, filename);
}
