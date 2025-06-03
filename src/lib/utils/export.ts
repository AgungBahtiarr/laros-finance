import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type * as pdfMakeType from 'pdfmake/build/pdfmake';
import type { WorkBook } from 'xlsx';
import { formatCurrency } from './utils.client';
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
}

interface ProfitLossData {
	revenues: AccountBalance[];
	expenses: AccountBalance[];
	revenueTotals: { balance: number; debit: number; credit: number };
	expenseTotals: { balance: number; debit: number; credit: number };
	netIncome: number;
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
}

export async function exportToPdf(
	data: ProfitLossData,
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
			{ text: 'Profit & Loss Statement', style: 'header' },
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
						// Revenue Section
						[
							{
								text: 'Revenues',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f0f0f0'
							}
						],
						...getRevenueRows(data, showPercentages, compareWithPrevious),
						getRevenueTotalRow(data, showPercentages, compareWithPrevious),
						// Expense Section
						[
							{
								text: 'Expenses',
								style: 'sectionHeader',
								colSpan: getColumnCount(showPercentages, compareWithPrevious),
								fillColor: '#f0f0f0'
							}
						],
						...getExpenseRows(data, showPercentages, compareWithPrevious),
						getExpenseTotalRow(data, showPercentages, compareWithPrevious),
						// Net Income
						getNetIncomeRow(data, showPercentages, compareWithPrevious)
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

	pdfMake.createPdf(docDefinition).download('profit-loss-report.pdf');
}

export async function exportToExcel(
	data: ProfitLossData,
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
	wsData.push(['Profit & Loss Statement']);
	wsData.push([`Period: ${dateRange.start} to ${dateRange.end}`]);
	wsData.push([]); // Empty row for spacing

	// Add headers
	const headers = ['Account', 'Current Period'];
	if (showPercentages) headers.push('% of Revenue');
	if (compareWithPrevious) {
		headers.push('Previous Period');
		if (showPercentages) headers.push('% of Revenue');
		headers.push('Change');
	}
	wsData.push(headers);

	// Add Revenues section
	wsData.push(['Revenues']); // Section header
	if (data.revenues && data.revenues.length > 0) {
		data.revenues.forEach((revenue) => {
			const row = ['  '.repeat(revenue.level) + revenue.name, formatCurrency(revenue.balance || 0)];
			if (showPercentages) {
				row.push(calculatePercentage(revenue.balance || 0, data.revenueTotals.balance || 0));
			}
			if (compareWithPrevious && data.previousPeriod) {
				const prevRevenue = data.previousPeriod.revenues.find((r) => r.id === revenue.id);
				row.push(prevRevenue ? formatCurrency(prevRevenue.balance || 0) : '-');
				if (showPercentages) {
					const prevTotal = data.previousPeriod.revenues.reduce(
						(sum, r) => sum + (r.balance || 0),
						0
					);
					row.push(prevRevenue ? calculatePercentage(prevRevenue.balance || 0, prevTotal) : '-');
				}
				if (prevRevenue) {
					const change = calculateChange(revenue.balance || 0, prevRevenue.balance || 0);
					row.push(change.display);
				} else {
					row.push('-');
				}
			}
			wsData.push(row);
		});
	} else {
		wsData.push(['No revenue data found']);
	}

	// Add Revenue Total
	const revenueTotalRow = ['Total Revenues', formatCurrency(data.revenueTotals.balance || 0)];
	if (showPercentages) {
		revenueTotalRow.push('100%');
	}
	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal = data.previousPeriod.revenues.reduce((sum, r) => sum + (r.balance || 0), 0);
		revenueTotalRow.push(formatCurrency(prevTotal));
		if (showPercentages) {
			revenueTotalRow.push('100%');
		}
		const change = calculateChange(data.revenueTotals.balance || 0, prevTotal);
		revenueTotalRow.push(change.display);
	}
	wsData.push(revenueTotalRow);
	wsData.push([]); // Empty row for spacing

	// Add Expenses section
	wsData.push(['Expenses']); // Section header
	if (data.expenses && data.expenses.length > 0) {
		data.expenses.forEach((expense) => {
			const row = ['  '.repeat(expense.level) + expense.name, formatCurrency(expense.balance || 0)];
			if (showPercentages) {
				row.push(calculatePercentage(expense.balance || 0, data.revenueTotals.balance || 0));
			}
			if (compareWithPrevious && data.previousPeriod) {
				const prevExpense = data.previousPeriod.expenses.find((e) => e.id === expense.id);
				row.push(prevExpense ? formatCurrency(prevExpense.balance || 0) : '-');
				if (showPercentages) {
					const prevTotal = data.previousPeriod.revenues.reduce(
						(sum, r) => sum + (r.balance || 0),
						0
					);
					row.push(prevExpense ? calculatePercentage(prevExpense.balance || 0, prevTotal) : '-');
				}
				if (prevExpense) {
					const change = calculateChange(expense.balance || 0, prevExpense.balance || 0);
					row.push(change.display);
				} else {
					row.push('-');
				}
			}
			wsData.push(row);
		});
	} else {
		wsData.push(['No expense data found']);
	}

	// Add Expense Total
	const expenseTotalRow = ['Total Expenses', formatCurrency(data.expenseTotals.balance || 0)];
	if (showPercentages) {
		expenseTotalRow.push(
			calculatePercentage(data.expenseTotals.balance || 0, data.revenueTotals.balance || 0)
		);
	}
	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal = data.previousPeriod.expenses.reduce((sum, e) => sum + (e.balance || 0), 0);
		expenseTotalRow.push(formatCurrency(prevTotal));
		if (showPercentages) {
			const prevRevenueTotal = data.previousPeriod.revenues.reduce(
				(sum, r) => sum + (r.balance || 0),
				0
			);
			expenseTotalRow.push(calculatePercentage(prevTotal, prevRevenueTotal));
		}
		const change = calculateChange(data.expenseTotals.balance || 0, prevTotal);
		expenseTotalRow.push(change.display);
	}
	wsData.push(expenseTotalRow);
	wsData.push([]); // Empty row for spacing

	// Add Net Income
	const netIncomeRow = ['Net Income', formatCurrency(data.netIncome)];
	if (showPercentages) {
		netIncomeRow.push(calculatePercentage(data.netIncome, data.revenueTotals.balance || 0));
	}
	if (compareWithPrevious && data.previousPeriod) {
		netIncomeRow.push(formatCurrency(data.previousPeriod.netIncome));
		if (showPercentages) {
			const prevRevenueTotal = data.previousPeriod.revenues.reduce(
				(sum, r) => sum + (r.balance || 0),
				0
			);
			netIncomeRow.push(calculatePercentage(data.previousPeriod.netIncome, prevRevenueTotal));
		}
		const change = calculateChange(data.netIncome, data.previousPeriod.netIncome);
		netIncomeRow.push(change.display);
	}
	wsData.push(netIncomeRow);

	// Create worksheet
	const ws = XLSX.utils.aoa_to_sheet(wsData);

	// Add styling
	const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
	const maxCol = range.e.c;

	// Set column widths
	ws['!cols'] = [
		{ wch: 40 }, // Account name
		{ wch: 15 }, // Current Period
		...(showPercentages ? [{ wch: 12 }] : []), // % of Revenue
		...(compareWithPrevious
			? [
					{ wch: 15 }, // Previous Period
					...(showPercentages ? [{ wch: 12 }] : []), // Previous % of Revenue
					{ wch: 20 } // Change
				]
			: [])
	];

	// Create workbook and add worksheet
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');

	// Save the file
	XLSX.writeFile(wb, 'profit-loss-report.xlsx');
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
	let count = 2; // Account and Current Period
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
		{ text: 'Current Period', alignment: 'right', bold: true }
	];
	if (showPercentages) headers.push({ text: '% of Revenue', alignment: 'right', bold: true });
	if (compareWithPrevious) {
		headers.push({ text: 'Previous Period', alignment: 'right', bold: true });
		if (showPercentages) headers.push({ text: '% of Revenue', alignment: 'right', bold: true });
		headers.push({ text: 'Change', alignment: 'right', bold: true });
	}
	return headers;
}

function getRevenueRows(
	data: ProfitLossData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[][] {
	return data.revenues.map((revenue) => {
		const row: TableCell[] = [
			{ text: revenue.name, margin: [revenue.level * 10, 0, 0, 0] },
			{ text: formatCurrency(revenue.balance || 0), alignment: 'right' }
		];

		if (showPercentages) {
			row.push({
				text: calculatePercentage(revenue.balance || 0, data.revenueTotals.balance || 0),
				alignment: 'right'
			});
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevRevenue = data.previousPeriod.revenues.find((r) => r.id === revenue.id);
			row.push({
				text: prevRevenue ? formatCurrency(prevRevenue.balance || 0) : '-',
				alignment: 'right'
			});

			if (showPercentages) {
				row.push({
					text: prevRevenue
						? calculatePercentage(
								prevRevenue.balance || 0,
								data.previousPeriod.revenues.reduce((sum, r) => sum + (r.balance || 0), 0) || 0
							)
						: '-',
					alignment: 'right'
				});
			}

			if (prevRevenue) {
				const change = calculateChange(revenue.balance || 0, prevRevenue.balance || 0);
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

function getExpenseRows(
	data: ProfitLossData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[][] {
	return data.expenses.map((expense) => {
		const row: TableCell[] = [
			{ text: expense.name, margin: [expense.level * 10, 0, 0, 0] },
			{ text: formatCurrency(expense.balance || 0), alignment: 'right' }
		];

		if (showPercentages) {
			row.push({
				text: calculatePercentage(expense.balance || 0, data.revenueTotals.balance || 0),
				alignment: 'right'
			});
		}

		if (compareWithPrevious && data.previousPeriod) {
			const prevExpense = data.previousPeriod.expenses.find((e) => e.id === expense.id);
			row.push({
				text: prevExpense ? formatCurrency(prevExpense.balance || 0) : '-',
				alignment: 'right'
			});

			if (showPercentages) {
				row.push({
					text: prevExpense
						? calculatePercentage(
								prevExpense.balance || 0,
								data.previousPeriod.revenues.reduce((sum, r) => sum + (r.balance || 0), 0) || 0
							)
						: '-',
					alignment: 'right'
				});
			}

			if (prevExpense) {
				const change = calculateChange(expense.balance || 0, prevExpense.balance || 0);
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

function getRevenueTotalRow(
	data: ProfitLossData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: 'Total Revenues', style: 'total', bold: true },
		{ text: formatCurrency(data.revenueTotals.balance || 0), alignment: 'right', style: 'total' }
	];

	if (showPercentages) {
		row.push({ text: '100%', alignment: 'right', style: 'total' });
	}

	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal =
			data.previousPeriod.revenues.reduce((sum, r) => sum + (r.balance || 0), 0) || 0;
		row.push({ text: formatCurrency(prevTotal), alignment: 'right', style: 'total' });

		if (showPercentages) {
			row.push({ text: '100%', alignment: 'right', style: 'total' });
		}

		const change = calculateChange(data.revenueTotals.balance || 0, prevTotal);
		row.push({
			text: change.display,
			alignment: 'right',
			style: 'total',
			fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
		});
	}

	return row;
}

function getExpenseTotalRow(
	data: ProfitLossData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: 'Total Expenses', style: 'total', bold: true },
		{ text: formatCurrency(data.expenseTotals.balance || 0), alignment: 'right', style: 'total' }
	];

	if (showPercentages) {
		row.push({
			text: calculatePercentage(data.expenseTotals.balance || 0, data.revenueTotals.balance || 0),
			alignment: 'right',
			style: 'total'
		});
	}

	if (compareWithPrevious && data.previousPeriod) {
		const prevTotal =
			data.previousPeriod.expenses.reduce((sum, e) => sum + (e.balance || 0), 0) || 0;
		row.push({ text: formatCurrency(prevTotal), alignment: 'right', style: 'total' });

		if (showPercentages) {
			row.push({
				text: calculatePercentage(
					prevTotal,
					data.previousPeriod.revenues.reduce((sum, r) => sum + (r.balance || 0), 0) || 0
				),
				alignment: 'right',
				style: 'total'
			});
		}

		const change = calculateChange(data.expenseTotals.balance || 0, prevTotal);
		row.push({
			text: change.display,
			alignment: 'right',
			style: 'total',
			fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
		});
	}

	return row;
}

function getNetIncomeRow(
	data: ProfitLossData,
	showPercentages: boolean,
	compareWithPrevious: boolean
): TableCell[] {
	const row: TableCell[] = [
		{ text: 'Net Income', style: 'total', bold: true },
		{ text: formatCurrency(data.netIncome), alignment: 'right', style: 'total' }
	];

	if (showPercentages) {
		row.push({
			text: calculatePercentage(data.netIncome, data.revenueTotals.balance || 0),
			alignment: 'right',
			style: 'total'
		});
	}

	if (compareWithPrevious && data.previousPeriod) {
		row.push({
			text: formatCurrency(data.previousPeriod.netIncome),
			alignment: 'right',
			style: 'total'
		});

		if (showPercentages) {
			row.push({
				text: calculatePercentage(
					data.previousPeriod.netIncome,
					data.previousPeriod.revenues.reduce((sum, r) => sum + (r.balance || 0), 0) || 0
				),
				alignment: 'right',
				style: 'total'
			});
		}

		const change = calculateChange(data.netIncome, data.previousPeriod.netIncome);
		row.push({
			text: change.display,
			alignment: 'right',
			style: 'total',
			fillColor: change.value > 0 ? '#e6ffe6' : change.value < 0 ? '#ffe6e6' : undefined
		});
	}

	return row;
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
