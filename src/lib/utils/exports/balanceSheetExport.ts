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
	name: string;
	balance: number;
	level: number;
	id: number;
	debit: number;
	credit: number;
	groupName?: string;
}

interface BalanceSheetData {
	aktivaLancar: AccountBalance[];
	aktivaTetap: AccountBalance[];
	aktivaLainnya: AccountBalance[];
	totalAktiva: {
		debit: number;
		credit: number;
		balance: number;
	};
	hutangLancar: AccountBalance[];
	hutangJangkaPanjang: AccountBalance[];
	modal: AccountBalance[];
	totalPasiva: {
		debit: number;
		credit: number;
		balance: number;
	};
	previousPeriod?: {
		aktivaLancar: AccountBalance[];
		aktivaTetap: AccountBalance[];
		aktivaLainnya: AccountBalance[];
		hutangLancar: AccountBalance[];
		hutangJangkaPanjang: AccountBalance[];
		modal: AccountBalance[];
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

export async function exportBalanceSheetToPdf(
	data: BalanceSheetData,
	dateRange: { start: string; end: string },
	showPercentages: boolean,
	compareWithPrevious: boolean
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
			{ text: 'Balance Sheet', style: 'header' },
			{
				text: `Period: ${dateRange.start} to ${dateRange.end}`,
				style: 'subheader',
				margin: [0, 0, 0, 10]
			},
			{
				table: {
					headerRows: 1,
					widths: getColumnWidths(showPercentages, compareWithPrevious),
					body: [
						getTableHeaders(showPercentages, compareWithPrevious),
						// Assets Section
						[
							{
								text: 'AKTIVA (ASSETS)',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f0f0f0'
							}
						],
						// Current Assets
						[
							{
								text: 'Aktiva Lancar (Current Assets)',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f5f5f5'
							}
						],
						...getAssetRows(
							data.aktivaLancar,
							data,
							'aktivaLancar',
							showPercentages,
							compareWithPrevious
						),
						// Fixed Assets
						[
							{
								text: 'Aktiva Tetap (Fixed Assets)',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f5f5f5'
							}
						],
						...getAssetRows(
							data.aktivaTetap,
							data,
							'aktivaTetap',
							showPercentages,
							compareWithPrevious
						),
						// Other Assets
						[
							{
								text: 'Aktiva Lainnya (Other Assets)',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f5f5f5'
							}
						],
						...getAssetRows(
							data.aktivaLainnya,
							data,
							'aktivaLainnya',
							showPercentages,
							compareWithPrevious
						),
						// Total Assets
						getTotalAssetsRow(data, showPercentages, compareWithPrevious),
						// Liabilities and Equity Section
						[
							{
								text: 'PASIVA (LIABILITIES & EQUITY)',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f0f0f0'
							}
						],
						// Current Liabilities
						[
							{
								text: 'Hutang Lancar (Current Liabilities)',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f5f5f5'
							}
						],
						...getLiabilityRows(
							data.hutangLancar,
							data,
							'hutangLancar',
							showPercentages,
							compareWithPrevious
						),
						// Long-term Liabilities
						[
							{
								text: 'Hutang Jangka Panjang (Long-term Liabilities)',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f5f5f5'
							}
						],
						...getLiabilityRows(
							data.hutangJangkaPanjang,
							data,
							'hutangJangkaPanjang',
							showPercentages,
							compareWithPrevious
						),
						// Equity
						[
							{
								text: 'Modal (Equity)',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f5f5f5'
							}
						],
						...getEquityRows(data.modal, data, showPercentages, compareWithPrevious),
						// Total Liabilities and Equity
						getTotalPasivaRow(data, showPercentages, compareWithPrevious)
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

	pdfMake.createPdf(docDefinition).download('balance-sheet.pdf');
}

export async function exportBalanceSheetToExcel(
	data: BalanceSheetData,
	dateRange: { start: string; end: string },
	showPercentages: boolean,
	compareWithPrevious: boolean
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
	wsData.push(['Balance Sheet']);
	wsData.push([`Period: ${dateRange.start} to ${dateRange.end}`]);
	wsData.push([]); // Empty row for spacing

	// Add headers
	const headers = ['Account', 'Balance'];
	if (showPercentages) headers.push('% of Total');
	if (compareWithPrevious) {
		headers.push('Previous Period');
		if (showPercentages) headers.push('% of Total');
		headers.push('Change');
	}
	wsData.push(headers);

	// Add Assets section
	wsData.push(['AKTIVA (ASSETS)']);

	// Current Assets
	wsData.push(['Aktiva Lancar (Current Assets)']);
	addAccountsToWorksheet(
		wsData,
		data.aktivaLancar,
		data.totalAktiva.balance,
		'aktivaLancar',
		data,
		showPercentages,
		compareWithPrevious
	);

	// Fixed Assets
	wsData.push(['Aktiva Tetap (Fixed Assets)']);
	addAccountsToWorksheet(
		wsData,
		data.aktivaTetap,
		data.totalAktiva.balance,
		'aktivaTetap',
		data,
		showPercentages,
		compareWithPrevious
	);

	// Other Assets
	wsData.push(['Aktiva Lainnya (Other Assets)']);
	addAccountsToWorksheet(
		wsData,
		data.aktivaLainnya,
		data.totalAktiva.balance,
		'aktivaLainnya',
		data,
		showPercentages,
		compareWithPrevious
	);

	// Total Assets
	addTotalToWorksheet(
		wsData,
		'Total Aktiva (Total Assets)',
		data.totalAktiva.balance,
		data,
		showPercentages,
		compareWithPrevious
	);
	wsData.push([]); // Empty row for spacing

	// Add Liabilities and Equity section
	wsData.push(['PASIVA (LIABILITIES & EQUITY)']);

	// Current Liabilities
	wsData.push(['Hutang Lancar (Current Liabilities)']);
	addAccountsToWorksheet(
		wsData,
		data.hutangLancar,
		data.totalPasiva.balance,
		'hutangLancar',
		data,
		showPercentages,
		compareWithPrevious
	);

	// Long-term Liabilities
	wsData.push(['Hutang Jangka Panjang (Long-term Liabilities)']);
	addAccountsToWorksheet(
		wsData,
		data.hutangJangkaPanjang,
		data.totalPasiva.balance,
		'hutangJangkaPanjang',
		data,
		showPercentages,
		compareWithPrevious
	);

	// Equity
	wsData.push(['Modal (Equity)']);
	addAccountsToWorksheet(
		wsData,
		data.modal,
		data.totalPasiva.balance,
		'modal',
		data,
		showPercentages,
		compareWithPrevious
	);

	// Total Liabilities and Equity
	addTotalToWorksheet(
		wsData,
		'Total Pasiva (Total Liabilities & Equity)',
		data.totalPasiva.balance,
		data,
		showPercentages,
		compareWithPrevious
	);

	// Create worksheet
	const ws = XLSX.utils.aoa_to_sheet(wsData);

	// Add styling
	const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
	const maxCol = range.e.c;

	// Set column widths
	ws['!cols'] = [
		{ wch: 40 }, // Account name
		{ wch: 15 }, // Balance
		...(showPercentages ? [{ wch: 12 }] : []), // % of Total
		...(compareWithPrevious
			? [
					{ wch: 15 }, // Previous Period
					...(showPercentages ? [{ wch: 12 }] : []), // Previous % of Total
					{ wch: 20 } // Change
				]
			: [])
	];

	// Create workbook and add worksheet
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');

	// Save the file
	XLSX.writeFile(wb, 'balance-sheet.xlsx');
}

// Helper functions
function getColumnWidths(showPercentages: boolean, compareWithPrevious: boolean): string[] {
	const widths = ['*', 'auto'];
	if (showPercentages) widths.push('auto');
	if (compareWithPrevious) {
		widths.push('auto');
		if (showPercentages) widths.push('auto');
		widths.push('auto');
	}
	return widths;
}

function getColumnCount(showPercentages: boolean, compareWithPrevious: boolean): number {
	let count = 2; // Account and Balance
	if (showPercentages) count++;
	if (compareWithPrevious) {
		count += 2; // Previous Period and Change
		if (showPercentages) count++;
	}
	return count;
}

function getTableHeaders(showPercentages: boolean, compareWithPrevious: boolean): TableCell[] {
	const headers = [
		{ text: 'Account', bold: true },
		{ text: 'Balance', alignment: 'right', bold: true }
	];
	if (showPercentages) headers.push({ text: '% of Total', alignment: 'right', bold: true });
	if (compareWithPrevious) {
		headers.push({ text: 'Previous Period', alignment: 'right', bold: true });
		if (showPercentages) headers.push({ text: '% of Total', alignment: 'right', bold: true });
		headers.push({ text: 'Change', alignment: 'right', bold: true });
	}
	return headers;
}

function calculatePercentage(value: number, total: number): string {
	if (!total) return '0.00%';
	return ((value / total) * 100).toFixed(2) + '%';
}

function calculateChange(current: number, previous: number): { value: number; display: string } {
	const change = current - previous;
	const percentChange = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
	return {
		value: change,
		display: `${formatCurrency(change)} (${percentChange.toFixed(2)}%)`
	};
}

function formatForPdf(amount: number): string {
	if (amount === null || amount === undefined) return '-';
	const num = Number(amount);
	if (num < 0) {
		return `(${Math.abs(num).toLocaleString('id-ID')})`;
	}
	return num.toLocaleString('id-ID');
}

function calculateChangeForPdf(
	current: number,
	previous: number
): { value: number; display: string } {
	const change = current - previous;
	const percentChange = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
	return {
		value: change,
		display: `${formatForPdf(change)} (${percentChange.toFixed(2)}%)`
	};
}

function getAssetRows(
	assets: AccountBalance[],
	data: BalanceSheetData,
	type: 'aktivaLancar' | 'aktivaTetap' | 'aktivaLainnya',
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[][] {
	return assets.map((asset) => {
		const row: TableCell[] = [
			{ text: asset.name, margin: [asset.level * 10, 0, 0, 0] },
			{ text: formatForPdf(asset.balance || 0), alignment: 'right' }
		];

		if (showPercentages) {
			row.push({
				text: calculatePercentage(asset.balance || 0, data.totalAktiva.balance),
				alignment: 'right'
			});
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevAsset = data.previousPeriod[type]?.find((a) => a.id === asset.id);
			row.push({
				text: prevAsset ? formatForPdf(prevAsset.balance || 0) : '-',
				alignment: 'right'
			});

			if (showPercentages && prevAsset) {
				const prevTotal = data.previousPeriod[type].reduce((sum, a) => sum + (a.balance || 0), 0);
				row.push({
					text: calculatePercentage(prevAsset.balance || 0, prevTotal),
					alignment: 'right'
				});
			}

			if (prevAsset) {
				const change = calculateChangeForPdf(asset.balance || 0, prevAsset.balance || 0);
				row.push({
					text: change.display,
					alignment: 'right',
					fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
				});
			} else {
				row.push({ text: '-', alignment: 'right' });
			}
		}

		return row;
	});
}

function getLiabilityRows(
	liabilities: AccountBalance[],
	data: BalanceSheetData,
	type: 'hutangLancar' | 'hutangJangkaPanjang',
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[][] {
	return liabilities.map((liability) => {
		const row: TableCell[] = [
			{ text: liability.name, margin: [liability.level * 10, 0, 0, 0] },
			{ text: formatForPdf(liability.balance || 0), alignment: 'right' }
		];

		if (showPercentages) {
			row.push({
				text: calculatePercentage(liability.balance || 0, data.totalPasiva.balance),
				alignment: 'right'
			});
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevLiability = data.previousPeriod[type]?.find((l) => l.id === liability.id);
			row.push({
				text: prevLiability ? formatForPdf(prevLiability.balance || 0) : '-',
				alignment: 'right'
			});

			if (showPercentages && prevLiability) {
				const prevTotal = data.previousPeriod[type].reduce((sum, l) => sum + (l.balance || 0), 0);
				row.push({
					text: calculatePercentage(prevLiability.balance || 0, prevTotal),
					alignment: 'right'
				});
			}

			if (prevLiability) {
				const change = calculateChangeForPdf(liability.balance || 0, prevLiability.balance || 0);
				row.push({
					text: change.display,
					alignment: 'right',
					fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
				});
			} else {
				row.push({ text: '-', alignment: 'right' });
			}
		}

		return row;
	});
}

function getEquityRows(
	equity: AccountBalance[],
	data: BalanceSheetData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[][] {
	return equity.map((item) => {
		const row: TableCell[] = [
			{ text: item.name, margin: [item.level * 10, 0, 0, 0] },
			{ text: formatForPdf(item.balance || 0), alignment: 'right' }
		];

		if (showPercentages) {
			row.push({
				text: calculatePercentage(item.balance || 0, data.totalPasiva.balance),
				alignment: 'right'
			});
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevEquity = data.previousPeriod.modal?.find((e) => e.id === item.id);
			row.push({
				text: prevEquity ? formatForPdf(prevEquity.balance || 0) : '-',
				alignment: 'right'
			});

			if (showPercentages && prevEquity) {
				const prevTotal = data.previousPeriod.modal.reduce((sum, e) => sum + (e.balance || 0), 0);
				row.push({
					text: calculatePercentage(prevEquity.balance || 0, prevTotal),
					alignment: 'right'
				});
			}

			if (prevEquity) {
				const change = calculateChangeForPdf(item.balance || 0, prevEquity.balance || 0);
				row.push({
					text: change.display,
					alignment: 'right',
					fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
				});
			} else {
				row.push({ text: '-', alignment: 'right' });
			}
		}

		return row;
	});
}

function getTotalAssetsRow(
	data: BalanceSheetData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: 'Total Aktiva (Total Assets)', style: 'total', bold: true },
		{ text: formatForPdf(data.totalAktiva.balance), alignment: 'right', style: 'total' }
	];

	if (showPercentages) {
		row.push({ text: '100%', alignment: 'right', style: 'total' });
	}

	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal = [
			...data.previousPeriod.aktivaLancar,
			...data.previousPeriod.aktivaTetap,
			...data.previousPeriod.aktivaLainnya
		].reduce((sum, a) => sum + (a.balance || 0), 0);

		row.push({ text: formatForPdf(prevTotal), alignment: 'right', style: 'total' });

		if (showPercentages) {
			row.push({ text: '100%', alignment: 'right', style: 'total' });
		}

		const change = calculateChangeForPdf(data.totalAktiva.balance, prevTotal);
		row.push({
			text: change.display,
			alignment: 'right',
			style: 'total',
			fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
		});
	}

	return row;
}

function getTotalPasivaRow(
	data: BalanceSheetData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: 'Total Pasiva (Total Liabilities & Equity)', style: 'total', bold: true },
		{ text: formatForPdf(data.totalPasiva.balance), alignment: 'right', style: 'total' }
	];

	if (showPercentages) {
		row.push({ text: '100%', alignment: 'right', style: 'total' });
	}

	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal = [
			...data.previousPeriod.hutangLancar,
			...data.previousPeriod.hutangJangkaPanjang,
			...data.previousPeriod.modal
		].reduce((sum, p) => sum + (p.balance || 0), 0);

		row.push({ text: formatForPdf(prevTotal), alignment: 'right', style: 'total' });

		if (showPercentages) {
			row.push({ text: '100%', alignment: 'right', style: 'total' });
		}

		const change = calculateChangeForPdf(data.totalPasiva.balance, prevTotal);
		row.push({
			text: change.display,
			alignment: 'right',
			style: 'total',
			fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
		});
	}

	return row;
}

function addAccountsToWorksheet(
	wsData: any[],
	accounts: AccountBalance[],
	total: number,
	type: string,
	data: BalanceSheetData,
	showPercentages: boolean,
	compareWithPrevious: boolean
) {
	accounts.forEach((account) => {
		const row = ['  '.repeat(account.level) + account.name, formatCurrency(account.balance || 0)];

		if (showPercentages) {
			row.push(calculatePercentage(account.balance || 0, total));
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevAccount = data.previousPeriod[type]?.find((a) => a.id === account.id);

			if (prevAccount) {
				row.push(formatCurrency(prevAccount.balance || 0));

				if (showPercentages) {
					const prevTotal = data.previousPeriod[type].reduce((sum, a) => sum + (a.balance || 0), 0);
					row.push(calculatePercentage(prevAccount.balance || 0, prevTotal));
				}

				const change = calculateChange(account.balance || 0, prevAccount.balance || 0);
				row.push(change.display);
			} else {
				row.push('-');
				if (showPercentages) row.push('-');
				row.push('-');
			}
		}

		wsData.push(row);
	});
}

function addTotalToWorksheet(
	wsData: any[],
	label: string,
	total: number,
	data: BalanceSheetData,
	showPercentages: boolean,
	compareWithPrevious: boolean
) {
	const row = [label, formatCurrency(total)];

	if (showPercentages) {
		row.push('100%');
	}

	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal = Object.values(data.previousPeriod)
			.flat()
			.reduce((sum, item) => sum + (item.balance || 0), 0);

		row.push(formatCurrency(prevTotal));

		if (showPercentages) {
			row.push('100%');
		}

		const change = calculateChange(total, prevTotal);
		row.push(change.display);
	}

	wsData.push(row);
}
