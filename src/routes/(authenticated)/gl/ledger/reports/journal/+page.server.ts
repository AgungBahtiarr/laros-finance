import type { PageServerLoad } from './$types';
import { and, eq, gte, lte } from 'drizzle-orm';
import { journalEntry, journalEntryLine, chartOfAccount } from '$lib/server/db/schema';

export const load: PageServerLoad = async (event) => {
	const { db } = event.locals;
	const searchParams = event.url.searchParams;
	const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
	const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

	// Get journal entries for the selected period
	const journalEntries = await db
		.select({
			id: journalEntry.id,
			number: journalEntry.number,
			date: journalEntry.date,
			description: journalEntry.description,
			reference: journalEntry.reference,
			line: {
				id: journalEntryLine.id,
				description: journalEntryLine.description,
				debitAmount: journalEntryLine.debitAmount,
				creditAmount: journalEntryLine.creditAmount,
				lineNumber: journalEntryLine.lineNumber
			},
			account: {
				id: chartOfAccount.id,
				code: chartOfAccount.code,
				name: chartOfAccount.name
			}
		})
		.from(journalEntry)
		.leftJoin(journalEntryLine, eq(journalEntryLine.journalEntryId, journalEntry.id))
		.leftJoin(chartOfAccount, eq(journalEntryLine.accountId, chartOfAccount.id))
		.where(and(gte(journalEntry.date, startDate), lte(journalEntry.date, endDate)))
		.orderBy(journalEntry.date, journalEntry.number);

	// Group journal details by journal entry
	const entries = journalEntries.reduce((acc, row) => {
		const entry = acc.find((e) => e.id === row.id);
		if (entry && row.line) {
			entry.details.push({
				accountId: row.account.id,
				accountCode: row.account.code,
				accountName: row.account.name,
				description: row.line.description,
				debit: row.line.debitAmount,
				credit: row.line.creditAmount,
				lineNumber: row.line.lineNumber
			});
		} else if (row.line) {
			acc.push({
				id: row.id,
				number: row.number,
				date: row.date,
				description: row.description,
				reference: row.reference,
				details: [
					{
						accountId: row.account.id,
						accountCode: row.account.code,
						accountName: row.account.name,
						description: row.line.description,
						debit: row.line.debitAmount,
						credit: row.line.creditAmount,
						lineNumber: row.line.lineNumber
					}
				]
			});
		}
		return acc;
	}, [] as any[]);

	// Calculate totals
	const totals = entries.reduce(
		(totals, entry) => {
			entry.details.forEach((detail: any) => {
				totals.debit += Number(detail.debit || 0);
				totals.credit += Number(detail.credit || 0);
			});
			return totals;
		},
		{ debit: 0, credit: 0 }
	);

	return {
		entries,
		totals
	};
};
