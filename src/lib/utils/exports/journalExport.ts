import * as XLSX from 'xlsx';
import { formatDate } from '../utils.client';

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
	rows.push(['Journal']); // Row 1
	rows.push(['From', data.period.start]); // Row 2
	rows.push(['To', data.period.end]); // Row 3
	rows.push([]); // Row 4 - empty

	// Row 5 - Column headers
	rows.push([
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
		rows.push([
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

			rows.push([
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
		rows.push([
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
