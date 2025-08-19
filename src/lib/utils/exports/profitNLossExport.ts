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

function getGroupedRows(accounts: AccountBalance[]): TableCell[][] {
	const rows: TableCell[][] = [];
	const indentMargin = 10; // Fixed indent

	accounts.forEach((account) => {
		if (account.balance !== 0) {
			const row: TableCell[] = [
				{ text: account.name, margin: [indentMargin, 0, 0, 0] },
				{ text: formatForPdf(account.balance || 0), alignment: 'right' },
				{ text: '' }
			];
			rows.push(row);
		}
	});

	return rows;
}

export async function exportToPdf(
	data: ProfitLossData,
	periodName: string,
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
			const indentMargin = 10; // Fixed indent
			const totalRow: TableCell[] = [
				{ text: `Total ${section.title}`, bold: true, margin: [indentMargin, 0, 0, 0] },
				{ text: '' },
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
				text: `Periode: ${periodName}`,
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

	const sanitizedPeriodName = periodName.replace(/\s+/g, '');
	const filename = `${sanitizedPeriodName}_laporan-laba-rugi.pdf`;
	pdfMake.createPdf(docDefinition).download(filename);
}

export async function exportToExcel(
	data: any, // Using any because the structure is now different
	periodName: string,
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

	const wb = XLSX.utils.book_new();
	const ws: { [key: string]: any } = {};
	let rowIndex = 0;

	// Define styles
	const boldStyle = { font: { bold: true } };
	const rightAlignStyle = { alignment: { horizontal: 'right' } };
	const boldRightAlignStyle = { font: { bold: true }, alignment: { horizontal: 'right' } };

	// Helper to add cell
	const addCell = (row: number, col: number, value: any, style?: any) => {
		const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
		const cell: { [key: string]: any } = { v: value };
		if (typeof value === 'number') {
			cell.t = 'n'; // Set cell type to number
			cell.v = value;
			cell.z = '#,##0.00;(#,##0.00);0.00'; // Excel format for accounting (black negatives)
		} else {
			cell.t = 's'; // Set cell type to string
		}
		if (style) {
			cell.s = style;
		}
		ws[cellRef] = cell;
	};

	// Title and Period
	addCell(rowIndex, 0, 'Laporan Laba Rugi', boldStyle);
	rowIndex++;
	addCell(rowIndex, 0, `Periode: ${periodName}`, boldStyle);
	rowIndex += 2; // Add a blank row

	// Headers
	const headers = ['Account', 'Balance', 'Summary'];
	headers.forEach((header, i) => addCell(rowIndex, i, header, boldStyle));
	rowIndex++;

	const sections = [
		{ title: 'Pendapatan', data: data.pendapatan },
		{ title: 'Harga Pokok (COGS/HPP)', data: data.hargaPokok },
		{ title: 'Biaya Operasional', data: data.biayaOperasional },
		{ title: 'Biaya Operasional Lainnya', data: data.biayaOperasionalLainnya },
		{ title: 'Biaya Administrasi & Umum', data: data.biayaAdministrasiUmum },
		{ title: '(Pendapatan) Biaya Lain-Lain', data: data.pendapatanBiayaLainLain }
	];

	const indent = '    '; // 4 spaces

	sections.forEach((section) => {
		if (section.data && section.data.length > 0) {
			const filteredData = section.data.filter((item: AccountBalance) => item.balance !== 0);
			if (filteredData.length > 0) {
				addCell(rowIndex, 0, section.title, boldStyle);
				rowIndex++;

				let sectionTotal = 0;
				filteredData.forEach((item: AccountBalance) => {
					addCell(rowIndex, 0, indent + item.name);
					addCell(rowIndex, 1, item.balance, rightAlignStyle);
					sectionTotal += item.balance || 0;
					rowIndex++;
				});

				addCell(rowIndex, 0, indent + `Total ${section.title}`, boldStyle);
				addCell(rowIndex, 2, sectionTotal, boldRightAlignStyle);
				rowIndex++;
				rowIndex++; // Blank row
			}
		}
	});

	// Net Income
	addCell(rowIndex, 0, 'Current Earning', boldStyle);
	addCell(rowIndex, 2, data.netIncome, boldRightAlignStyle);
	rowIndex++;

	// Set worksheet range
	const range = { s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: rowIndex } };
    ws['!ref'] = XLSX.utils.encode_range(range);

	// Set column widths
	ws['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }];

	XLSX.utils.book_append_sheet(wb, ws, 'Laba Rugi');

	const sanitizedPeriodName = periodName.replace(/\s+/g, '');
	const filename = `${sanitizedPeriodName}_laporan-laba-rugi.xlsx`;
	XLSX.writeFile(wb, filename);
}

// Helper functions
function getColumnWidths(showPercentages: boolean, compareWithPrevious: boolean): string[] {
	const widths = ['*', 'auto', 'auto'];
	if (showPercentages) widths.push('auto');
	if (compareWithPrevious) {
		widths.push('auto');
		if (showPercentages) widths.push('auto');
		widths.push('auto');
	}
	return widths;
}

function getColumnCount(showPercentages: boolean, compareWithPrevious: boolean): number {
	let count = 3; // Account and Balance
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
		{ text: 'Balance', alignment: 'right', bold: true },
		{ text: 'Summary', alignment: 'right', bold: true }
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
		{ text: 'Current Earning', style: 'total', bold: true },
		{ text: '' },
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
