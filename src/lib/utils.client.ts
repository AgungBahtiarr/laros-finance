// src/routes/(authenticated)/gl/ledger/reports/utils.client.ts

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function calculatePercentage(value: number, total: number): string {
	if (total === 0) return '0%';
	return ((value / total) * 100).toFixed(1) + '%';
}

export function calculateChange(
	currentValue: number,
	previousValue: number
): {
	value: number;
	percentage: number;
	display: string;
} {
	const change = currentValue - previousValue;
	const percentage = previousValue !== 0 ? (change / Math.abs(previousValue)) * 100 : 0;

	return {
		value: change,
		percentage,
		display: `${change >= 0 ? '+' : ''}${formatCurrency(change)} (${percentage.toFixed(1)}%)`
	};
}
