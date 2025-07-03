export function formatCurrency(amount: number | string | null | undefined): string {
	if (amount === null || amount === undefined) return '-';
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(num);
}

export function formatCurrencyWithDecimals(amount: number | string | null | undefined): string {
	if (amount === null || amount === undefined) return '-';
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(num);
}

export function calculatePercentage(value: number, total: number): string {
	if (total === 0) return '0%';
	return `${((value / total) * 100).toFixed(2)}%`;
}

export function calculateChange(
	current: number,
	previous: number
): { value: number; display: string } {
	if (previous === 0) {
		return { value: 0, display: '-' };
	}
	const change = ((current - previous) / Math.abs(previous)) * 100;
	return {
		value: change,
		display: `${change > 0 ? '+' : ''}${change.toFixed(2)}%`
	};
}

export function formatDate(dateString: string | Date): string {
	const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
	return new Intl.DateTimeFormat('id-ID', {
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	}).format(date);
}
