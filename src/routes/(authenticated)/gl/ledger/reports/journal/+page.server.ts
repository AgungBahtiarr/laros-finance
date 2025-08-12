import type { PageServerLoad } from './$types';
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm';
import { journalEntry, journalEntryLine, chartOfAccount } from '$lib/server/db/schema';

export const load: PageServerLoad = async (event) => {
	const { db } = event.locals;
	const searchParams = event.url.searchParams;
	const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
	const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
	const journalType = searchParams.get('journalType') || 'all';

	// Build base where conditions
	const baseConditions = [
		gte(journalEntry.date, startDate),
		lte(journalEntry.date, endDate),
		eq(journalEntry.status, 'POSTED')
	];

	// Handle journal type filter
	if (journalType === 'commitment') {
		baseConditions.push(sql`${journalEntry.number} NOT LIKE 'b%'`);
	} else if (journalType === 'breakdown') {
		baseConditions.push(sql`${journalEntry.number} LIKE 'b%'`);
	} else if (journalType === 'paired') {
		// Get all journal numbers in date range first
		const allJournalNumbers = await db
			.select({ number: journalEntry.number })
			.from(journalEntry)
			.where(and(...baseConditions.slice(0, -1))); // Remove status condition for broader search

		const pairedNumbers: string[] = [];

		// Check each journal number for its pair
		for (const journal of allJournalNumbers) {
			const number = journal.number;
			if (number.startsWith('b')) {
				// For breakdown journals, check if original exists
				const originalNumber = number.substring(1);
				const hasOriginal = allJournalNumbers.some((j) => j.number === originalNumber);
				if (hasOriginal) {
					pairedNumbers.push(number);
				}
			} else {
				// For original journals, check if breakdown exists
				const breakdownNumber = 'b' + number;
				const hasBreakdown = allJournalNumbers.some((j) => j.number === breakdownNumber);
				if (hasBreakdown) {
					pairedNumbers.push(number);
				}
			}
		}

		if (pairedNumbers.length > 0) {
			baseConditions.push(inArray(journalEntry.number, pairedNumbers));
		} else {
			// If no pairs found, return empty result
			baseConditions.push(sql`1 = 0`);
		}
	} else if (journalType === 'net') {
		// Net Transactions: Avoid double counting
		const allJournalNumbers = await db
			.select({ number: journalEntry.number })
			.from(journalEntry)
			.where(and(...baseConditions.slice(0, -1))); // Remove status condition for broader search

		const journalsWithoutDoubleCount: string[] = [];

		for (const journal of allJournalNumbers) {
			const number = journal.number;
			if (number.startsWith('b')) {
				// Always include breakdown journals
				journalsWithoutDoubleCount.push(number);
			} else {
				// Include commitment only if no breakdown pair exists
				const hasBreakdownPair = allJournalNumbers.some((j) => j.number === 'b' + number);
				if (!hasBreakdownPair) {
					journalsWithoutDoubleCount.push(number);
				}
			}
		}

		if (journalsWithoutDoubleCount.length > 0) {
			baseConditions.push(inArray(journalEntry.number, journalsWithoutDoubleCount));
		} else {
			baseConditions.push(sql`1 = 0`);
		}
	}

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
		.where(and(...baseConditions))
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
		totals,
		filters: {
			startDate,
			endDate,
			journalType
		}
	};
};
