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
	const rows: any[] = [];

	// Add header rows as shown in the image
ows.push(['Journal']); // Row 1
ows.push(['From', data.period.start]); // Row 2
ows.push(['To', data.period.end]); // Row 3
ows.push([]); // Row 4 - empty

	// Row 5 - Column headers
ows.push([
		'Date \n Account',
		'Journal Number \n Account Name',
		'Reff. Number \n Detail Note',
		'Note',
		'Debit',
		'Credit'
	]);

	// Add entries in the format shown in the image
	data.entries.forEach((entry) => {
		// Add journal header row with date, journal number, reference, note/description
	ows.push([
			entry.date, // Date
			entry.number, // Journal Number
			entry.reference || '', // Reference
			entry.description, // Note/Description
			'', // Empty debit
			'' // Empty credit
		]);

		// Add detail rows for each account line
		entry.details.forEach((detail) => {
			// Format line description to match import expectation
			const lineDescription = detail.description
				? `${detail.accountName} - ${detail.description}`
				: detail.accountName;

		ows.push([
				detail.accountCode, // Account code in first column
				detail.accountName, // Account name
				lineDescription, // Detail note
				'', // Empty note column
				detail.debit || '', // Debit amount
				detail.credit || '' // Credit amount
			]);
		});

		// Add total row
		const entryDebitTotal = entry.details.reduce((sum, d) => sum + (d.debit || 0), 0);
		const entryCreditTotal = entry.details.reduce((sum, d) => sum + (d.credit || 0), 0);
	ows.push([
			'', // Empty date column
			'Total', // Total label
			'', // Empty detail note
			'', // Empty note column
			entryDebitTotal, // Total debit
			entryCreditTotal // Total credit
		]);
	});

	const worksheet = XLSX.utils.aoa_to_sheet(rows);

	// Set column widths to match expected format
	const colWidths = [
		{ wch: 15 }, // Date/Account
		{ wch: 25 }, // Journal Number/Account Name
		{ wch: 25 }, // Reff. Number/Detail Note
		{ wch: 25 }, // Note
		{ wch: 15 }, // Debit
		{ wch: 15 } // Credit
	];
	worksheet['!cols'] = colWidths;

	// Apply number formatting for amount columns and wrap text for headers
	const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
	for (let row = range.s.r; row <= range.e.r; row++) {
		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
			if (!worksheet[cellRef]) continue;

			// Apply wrap text to header row (row 5, index 4)
			if (row === 4) {
				worksheet[cellRef].s = {
					font: { name: 'Arial', sz: 10, bold: true },
					alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
				};
			}
			// Apply number format to debit and credit columns (E and F)
			else if (col === 4 || col === 5) {
				// Debit and Credit columns
				worksheet[cellRef].s = {
					font: { name: 'Arial', sz: 10 },
					alignment: { vertical: 'center', horizontal: 'right' },
					numFmt: '#,##0'
				};
			} else if (col === 0 && row > 4) {
				// Date column (after header rows)
				worksheet[cellRef].s = {
					font: { name: 'Arial', sz: 10 },
					alignment: { vertical: 'center', horizontal: 'left' },
					numFmt: 'yyyy-mm-dd'
				};
			} else {
				worksheet[cellRef].s = {
					font: { name: 'Arial', sz: 10 },
					alignment: { vertical: 'center', horizontal: 'left' }
				};
			}
		}
	}

	// Set row height for header row to accommodate wrapped text
	if (!worksheet['!rows']) worksheet['!rows'] = [];
	worksheet['!rows'][4] = { hpt: 30 };

	XLSX.utils.book_append_sheet(workbook, worksheet, 'Journal');
	XLSX.writeFile(workbook, `report_journal${data.period.start}_to_${data.period.end}.xlsx`);
}

export async function exportJournalToPdf(data: JournalData) {
	const documentDefinition = {
		content: [
			{ text: 'Journal', style: 'header' },
			{
				text: `From: ${formatDate(data.period.start)} To: ${formatDate(data.period.end)}`,
				style: 'subheader'
			},
			{ text: '\n' }
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
				margin: [0, 10, 0, 5]
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

	data.entries.forEach((entry) => {
		documentDefinition.content.push({
			table: {
				headerRows: 1,
				widths: ['*', '*', '*', '*', '*', '*'],
				body: [
					[
						{ text: 'Date', style: 'tableHeader' },
						{ text: 'Journal Number', style: 'tableHeader' },
						{ text: 'Reference', style: 'tableHeader' },
						{ text: 'Description', style: 'tableHeader', colSpan: 3 },
						{},
						{}
					],
					[
						formatDate(entry.date),
						entry.number,
						entry.reference || '',
						{ text: entry.description, colSpan: 3 },
						{},
						{}
					]
				]
			},
			layout: 'lightHorizontalLines'
		});

		const detailsBody = [
			[
				{ text: 'Account', style: 'tableHeader' },
				{ text: 'Description', style: 'tableHeader' },
				{ text: 'Debit', style: 'tableHeader', alignment: 'right' },
				{ text: 'Credit', style: 'tableHeader', alignment: 'right' }
			]
		];

		entry.details.forEach((detail) => {
			detailsBody.push([
				{ text: `${detail.accountCode}\n${detail.accountName}`, style: 'tableCell' },
				{ text: detail.description, style: 'tableCell' },
				{
					text: detail.debit ? detail.debit.toFixed(2) : '',
					style: 'tableCell',
				alignment: 'right'
				},
				{
					text: detail.credit ? detail.credit.toFixed(2) : '',
					style: 'tableCell',
				alignment: 'right'
				}
			]);
		});

		const entryDebitTotal = entry.details.reduce((sum, d) => sum + (d.debit || 0), 0);
		const entryCreditTotal = entry.details.reduce((sum, d) => sum + (d.credit || 0), 0);

		detailsBody.push([
			{ text: 'Total', style: 'totals', colSpan: 2, alignment: 'left' },
			{},
			{ text: entryDebitTotal.toFixed(2), style: 'totals', alignment: 'right' },
			{ text: entryCreditTotal.toFixed(2), style: 'totals', alignment: 'right' }
		]);

		documentDefinition.content.push({
			table: {
				headerRows: 1,
				widths: ['auto', '*', 'auto', 'auto'],
				body: detailsBody
			},
			layout: 'lightHorizontalLines',
			margin: [0, 0, 0, 10]
		});
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
						text: `${formatDate(data.period.start)} - ${formatDate(data.period.end)}`,
						style: 'tableCell'
					},
					{ text: data.totals.debit.toFixed(2), style: 'tableCell', alignment: 'right' },
					{ text: data.totals.credit.toFixed(2), style: 'tableCell', alignment: 'right' }
				]
			]
		},
		layout: 'lightHorizontalLines'
	});

	pdfMake
		.createPdf(documentDefinition)
		.download(`report_journal_${data.period.start}_to_${data.period.end}.pdf`);
}

