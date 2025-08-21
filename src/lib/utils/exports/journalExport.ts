import * as XLSX from 'xlsx';
import { formatDate } from '../utils.client';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

if (typeof window !== 'undefined') {
	if (pdfFonts && pdfFonts.pdfMake) {
		pdfMake.vfs = pdfFonts.pdfMake.vfs;
	}
}

interface JournalDetail {
	accountCode: string;
	accountName: string;
	description: string;
	debit: number;
	credit: number;
}

interface JournalEntry {
	number: string;
	date: string;
	description: string;
	reference?: string;
	details: JournalDetail[];
}

interface JournalData {
	entries: JournalEntry[];
	totals: {
		debit: number;
		credit: number;
	};
	period: {
		start: string;
		end: string;
	};
}

export async function exportJournalToExcel(data: JournalData) {
	const workbook = XLSX.utils.book_new();
	const ws: { [key: string]: any } = {};
	let rowIndex = 0;

	// Define styles
	const headerStyle = {
		font: { name: 'Arial', sz: 10, bold: true },
		alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
	};
	const titleStyle = { font: { bold: true } };
	const numberStyle = {
		font: { name: 'Arial', sz: 10 },
		alignment: { horizontal: 'right' },
		numFmt: '#,##0.00'
	};
	const totalNumberStyle = {
		font: { name: 'Arial', sz: 10, bold: true },
		alignment: { horizontal: 'right' },
		numFmt: '#,##0.00'
	};
	const dateStyle = {
		font: { name: 'Arial', sz: 10 },
		alignment: { vertical: 'center', horizontal: 'left' },
		numFmt: 'yyyy-mm-dd'
	};
	const defaultStyle = {
		font: { name: 'Arial', sz: 10 },
		alignment: { vertical: 'center', horizontal: 'left' }
	};
	const totalLabelStyle = { ...defaultStyle, font: { ...defaultStyle.font, bold: true } };

	// Helper to add cell
	const addCell = (row: number, col: number, value: any, style?: any) => {
		const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
		if (value === null || value === undefined || value === '' || value === 0) {
			return; // Add nothing for empty cell
		}

		const cell: { [key: string]: any } = { v: value };

		if (typeof value === 'number') {
			cell.t = 'n';
		} else if (value instanceof Date) {
			cell.t = 'd';
		} else {
			cell.t = 's';
		}

		if (style) {
			cell.s = style;
			if (style.numFmt && (cell.t === 'n' || cell.t === 'd')) {
				cell.z = style.numFmt;
			}
		}
		ws[cellRef] = cell;
	};

	// Add header rows
	addCell(rowIndex, 0, 'Journal', titleStyle);
	rowIndex++;
	addCell(rowIndex, 0, 'From');
	addCell(rowIndex, 1, data.period.start);
	rowIndex++;
	addCell(rowIndex, 0, 'To');
	addCell(rowIndex, 1, data.period.end);
	rowIndex++;
	rowIndex++; // Empty row

	// Column headers
	const headers = [
		'Date \n Account',
		'Journal Number \n Account Name',
		'Reff. Number \n Detail Note',
		'Note',
		'Debit',
		'Credit'
	];
	const headerRowIndex = rowIndex;
	headers.forEach((header, i) => addCell(rowIndex, i, header, headerStyle));
	rowIndex++;

	// Add entries
	data.entries.forEach((entry) => {
		// Journal header row
		addCell(rowIndex, 0, new Date(entry.date), dateStyle);
		addCell(rowIndex, 1, entry.number, defaultStyle);
		addCell(rowIndex, 2, entry.reference || '', defaultStyle);
		addCell(rowIndex, 3, entry.description, defaultStyle);
		rowIndex++;

		// Detail rows
		entry.details.forEach((detail) => {
			const lineDescription = detail.description ? `${detail.description}` : detail.accountName;
			addCell(rowIndex, 0, detail.accountCode, defaultStyle);
			addCell(rowIndex, 1, detail.accountName, defaultStyle);
			addCell(rowIndex, 2, lineDescription, defaultStyle);
			addCell(rowIndex, 4, detail.debit, numberStyle);
			addCell(rowIndex, 5, detail.credit, numberStyle);
			rowIndex++;
		});

		// Total row
		const entryDebitTotal = entry.details.reduce((sum, d) => sum + (d.debit || 0), 0);
		const entryCreditTotal = entry.details.reduce((sum, d) => sum + (d.credit || 0), 0);
		addCell(rowIndex, 1, 'Total', totalLabelStyle);
		addCell(rowIndex, 4, entryDebitTotal, totalNumberStyle);
		addCell(rowIndex, 5, entryCreditTotal, totalNumberStyle);
		rowIndex++;
	});

	// Set worksheet range
	const range = { s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: rowIndex - 1 } };
	ws['!ref'] = XLSX.utils.encode_range(range);

	// Set column widths
	ws['!cols'] = [
		{ wch: 15 }, // Date/Account
		{ wch: 25 }, // Journal Number/Account Name
		{ wch: 25 }, // Reff. Number/Detail Note
		{ wch: 25 }, // Note
		{ wch: 15 }, // Debit
		{ wch: 15 } // Credit
	];

	// Set row height for header row
	if (!ws['!rows']) ws['!rows'] = [];
	ws['!rows'][headerRowIndex] = { hpt: 30 };

	XLSX.utils.book_append_sheet(workbook, ws, 'Journal');
	XLSX.writeFile(workbook, `report_journal_${data.period.start}_to_${data.period.end}.xlsx`);
}

function formatForPdf(amount: number): string {
    if (amount === null || amount === undefined) return '-';
    const num = Number(amount);
    if (num === 0) return '';

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

export async function exportJournalToPdf(data: JournalData) {
	const formatDateToNumeric = (dateString: string) => {
		const date = new Date(dateString);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	};

	const documentDefinition = {
		pageOrientation: 'landscape',
		content: [
			{
				stack: [
					{ text: 'Journal', style: 'header' },
					{
						text: `From: ${formatDateToNumeric(data.period.start)} \n To: ${formatDateToNumeric(
							data.period.end
						)}`,
						style: 'subheader'
					}
				],
				marginBottom: 15
			}
		],
		styles: {
			header: {
				fontSize: 18,
				bold: true
			},
			subheader: {
				fontSize: 14,
				bold: true,
				margin: [0, 5, 0, 5]
			},
			tableHeader: {
				bold: true,
				fontSize: 10,
				color: 'black',
				fillColor: '#eeeeee',
				alignment: 'center'
			},
			tableCell: {
				fontSize: 9
			},
			entryHeader: {
				bold: true,
				margin: [0, 5, 0, 5]
			},
			totals: {
				bold: true,
				margin: [0, 5, 0, 5]
			}
		},
		defaultStyle: {
			fontSize: 10
		}
	};

	const tableBody = [
		[
			{ text: 'Date\nAccount', style: 'tableHeader', alignment: 'left' },
			{ text: 'Journal Number\nAccount Name', style: 'tableHeader', alignment: 'left' },
			{ text: 'Reff. Number\nDetail Note', style: 'tableHeader', alignment: 'left' },
			{ text: 'Note', style: 'tableHeader', alignment: 'left' },
			{ text: 'Debit', style: 'tableHeader', alignment: 'right' },
			{ text: 'Credit', style: 'tableHeader', alignment: 'right' }
		]
	];

	data.entries.forEach((entry) => {
		tableBody.push([
			{ text: formatDateToNumeric(entry.date), style: 'tableCell', alignment: 'left' },
			{ text: entry.number, style: 'tableCell', alignment: 'left' },
			{ text: entry.reference || '', style: 'tableCell', alignment: 'left' },
			{ text: entry.description, style: 'tableCell', alignment: 'left' },
			{ text: '', style: 'tableCell' },
			{ text: '', style: 'tableCell' }
		]);

		entry.details.forEach((detail) => {
			const lineDescription = detail.description && detail.description !== detail.accountName ? detail.description : '';

			tableBody.push([
				{ text: detail.accountCode, style: 'tableCell', margin: [6, 0, 0, 0], alignment: 'left' },
				{ text: detail.accountName, style: 'tableCell', margin: [6, 0, 0, 0], alignment: 'left' },
				{ text: lineDescription, style: 'tableCell', margin: [6, 0, 0, 0], alignment: 'left' },
				{ text: '', style: 'tableCell', margin: [6, 0, 0, 0], alignment: 'left' },
				{ text: formatForPdf(detail.debit), style: 'tableCell', alignment: 'right' },
				{ text: formatForPdf(detail.credit), style: 'tableCell', alignment: 'right' }
			]);
		});

		const entryDebitTotal = entry.details.reduce((sum, d) => sum + (d.debit || 0), 0);
		const entryCreditTotal = entry.details.reduce((sum, d) => sum + (d.credit || 0), 0);

		tableBody.push([
			{ text: '', style: 'totals' },
			{ text: '', style: 'totals' },
			{ text: '', style: 'totals' },
			{ text: 'Total', style: 'totals', alignment: 'right' },
			{ text: formatForPdf(entryDebitTotal), style: 'totals', alignment: 'right' },
			{ text: formatForPdf(entryCreditTotal), style: 'totals', alignment: 'right' }
		]);
	});

	documentDefinition.content.push({
		table: {
			headerRows: 1,
			widths: ['auto', '*', '*', 'auto', 'auto', 'auto'],
			body: tableBody
		},
		layout: 'lightHorizontalLines'
	});

	documentDefinition.content.push({
		table: {
			headerRows: 1,
			widths: ['*', 'auto', 'auto'],
			body: [
				[
					{
						text: 'Report Summary',
						style: 'header',
						colSpan: 3,
						border: [false, false, false, false]
					},
					{},
					{}
				],
				[
					{ text: 'Period', style: 'tableHeader' },
					{ text: 'Total Debit', style: 'tableHeader', alignment: 'right' },
					{ text: 'Total Credit', style: 'tableHeader', alignment: 'right' }
				],
				[
					{
						text: `${formatDateToNumeric(data.period.start)} - ${formatDateToNumeric(
							data.period.end
						)}`,
						style: 'tableCell'
					},
					{ text: formatForPdf(data.totals.debit), style: 'tableCell', alignment: 'right' },
					{ text: formatForPdf(data.totals.credit), style: 'tableCell', alignment: 'right' }
				]
			]
		},
		layout: 'lightHorizontalLines'
	});

	pdfMake
		.createPdf(documentDefinition)
		.download(`report_journal_${data.period.start}_to_${data.period.end}.pdf`);
}

