import { db } from '$lib/server/db';
import { reportTemplate, reportTemplateLine, fiscalPeriod, chartOfAccount, journalEntry, journalEntryLine, accountType } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { eq, and, desc, asc, gte, lte, sum, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Get filter parameters
		const templateId = url.searchParams.get('templateId') || '';
		const fiscalPeriodId = url.searchParams.get('fiscalPeriodId') || '';
		const asOfDate = url.searchParams.get('asOfDate') || '';

		// Get report templates
		const templates = await db.query.reportTemplate.findMany({
			orderBy: [asc(reportTemplate.name)]
		});

		// Get fiscal periods for filter
		const fiscalPeriods = await db.query.fiscalPeriod.findMany({
			orderBy: [desc(fiscalPeriod.startDate)]
		});

		// Get account types
		const accountTypes = await db.query.accountType.findMany({
			orderBy: [asc(accountType.name)]
		});

		// Get accounts
		const accounts = await db.query.chartOfAccount.findMany({
			with: {
				accountType: true
			},
			orderBy: [asc(chartOfAccount.code)]
		});

		// If a template is selected, get the template details and generate report
		let selectedTemplate = null;
		let reportData = null;

		if (templateId) {
			// Get template with lines
			selectedTemplate = await db.query.reportTemplate.findFirst({
				where: eq(reportTemplate.id, parseInt(templateId)),
				with: {
					lines: {
						orderBy: [asc(reportTemplateLine.lineNumber)],
						with: {
							parent: true
						}
					}
				}
			});

			if (!selectedTemplate) {
				throw error(404, 'Report template not found');
			}

			// Determine date range for calculations
			let startDate = null;
			let endDate = null;

			if (fiscalPeriodId) {
				const period = await db.query.fiscalPeriod.findFirst({
					where: eq(fiscalPeriod.id, parseInt(fiscalPeriodId))
				});

				if (period) {
					startDate = period.startDate;
					endDate = period.endDate;
				}
			} else if (asOfDate) {
				// Use asOfDate as end date and beginning of year as start date
				endDate = new Date(asOfDate);
				startDate = new Date(endDate.getFullYear(), 0, 1); // Jan 1st of same year
			} else {
				// Default to current period or current date
				const currentPeriod = await db.query.fiscalPeriod.findFirst({
					where: eq(fiscalPeriod.isClosed, false),
					orderBy: [asc(fiscalPeriod.startDate)]
				});

				if (currentPeriod) {
					startDate = currentPeriod.startDate;
					endDate = currentPeriod.endDate;
				} else {
					endDate = new Date();
					startDate = new Date(endDate.getFullYear(), 0, 1); // Jan 1st of current year
				}
			}

			// Generate report data
			reportData = await generateReportData(selectedTemplate, startDate, endDate, accounts);
		}

		return {
			templates,
			fiscalPeriods,
			accountTypes,
			selectedTemplate,
			reportData,
			filters: {
				templateId,
				fiscalPeriodId,
				asOfDate
			}
		};
	} catch (err) {
		console.error('Error loading report data:', err);
		throw error(500, 'Failed to load report data');
	}
};

export const actions: Actions = {
	saveReportTemplate: async ({ request }) => {
		const formData = await request.formData();
		
		const name = formData.get('name') as string;
		const type = formData.get('type') as string;
		const description = formData.get('description') as string;
		
		try {
			// Create report template
			const result = await db.insert(reportTemplate).values({
				name,
				type,
				description
			}).returning({ id: reportTemplate.id });
			
			const templateId = result[0].id;
			
			return { 
				success: true,
				templateId
			};
		} catch (err) {
			console.error('Error creating report template:', err);
			return fail(500, {
				error: 'Failed to create report template',
				values: Object.fromEntries(formData)
			});
		}
	},
	
	saveReportLine: async ({ request }) => {
		const formData = await request.formData();
		
		const reportTemplateId = parseInt(formData.get('reportTemplateId') as string);
		const lineNumber = parseInt(formData.get('lineNumber') as string);
		const parentLineId = formData.get('parentLineId') ? parseInt(formData.get('parentLineId') as string) : null;
		const label = formData.get('label') as string;
		const type = formData.get('type') as string;
		const formula = formData.get('formula') as string;
		const accountIds = formData.get('accountIds') as string;
		const bold = formData.get('bold') === 'true';
		
		try {
			await db.insert(reportTemplateLine).values({
				reportTemplateId,
				lineNumber,
				parentLineId,
				label,
				type,
				formula,
				accountIds,
				bold
			});
			
			return { success: true };
		} catch (err) {
			console.error('Error creating report line:', err);
			return fail(500, {
				error: 'Failed to create report line',
				values: Object.fromEntries(formData)
			});
		}
	},
	
	deleteTemplate: async ({ request }) => {
		const formData = await request.formData();
		const templateId = parseInt(formData.get('templateId') as string);
		
		try {
			// Delete template lines first (cascade doesn't work with drizzle)
			await db.delete(reportTemplateLine)
				.where(eq(reportTemplateLine.reportTemplateId, templateId));
				
			// Then delete the template
			await db.delete(reportTemplate)
				.where(eq(reportTemplate.id, templateId));
			
			return { success: true };
		} catch (err) {
			console.error('Error deleting report template:', err);
			return fail(500, { error: 'Failed to delete report template' });
		}
	}
};

// Function to generate report data based on template and date range
async function generateReportData(template, startDate, endDate, accounts) {
	// Initialize result
	const reportData = {
		template,
		startDate,
		endDate,
		lineResults: []
	};
	
	// Process each template line
	for (const line of template.lines) {
		let lineValue = 0;
		
		// Process based on line type
		switch (line.type) {
			case 'HEADER':
				// Headers have no value
				break;
				
			case 'ACCOUNT':
				// Sum account balances
				if (line.accountIds) {
					const accountIdList = line.accountIds.split(',').map(id => parseInt(id.trim()));
					
					// Calculate balances for these accounts
					lineValue = await calculateAccountsBalance(accountIdList, startDate, endDate);
				}
				break;
				
			case 'CALCULATION':
				// Process formula - simple implementation for now
				if (line.formula) {
					// This is a very basic implementation - you'd need more sophisticated
					// formula parsing for a real system
					const matches = line.formula.match(/L(\d+)([\+\-]L\d+)*/g);
					
					if (matches) {
						for (const match of matches) {
							// Extract line numbers and operations
							const parts = match.split(/([+\-])/);
							let value = 0;
							let operation = '+';
							
							for (let i = 0; i < parts.length; i++) {
								const part = parts[i].trim();
								
								if (part === '+' || part === '-') {
									operation = part;
								} else if (part.startsWith('L')) {
									// Reference to another line
									const referencedLineNumber = parseInt(part.substring(1));
									const referencedLine = reportData.lineResults.find(
										r => r.line.lineNumber === referencedLineNumber
									);
									
									if (referencedLine) {
										if (operation === '+') {
											value += referencedLine.value;
										} else {
											value -= referencedLine.value;
										}
									}
								}
							}
							
							lineValue = value;
						}
					}
				}
				break;
				
			case 'TOTAL':
				// Sum child lines if this is a total line
				const childLines = reportData.lineResults.filter(
					r => r.line.parentLineId === line.id
				);
				
				lineValue = childLines.reduce((sum, child) => sum + child.value, 0);
				break;
				
			case 'SUBTOTAL':
				// Similar to TOTAL but may have different presentation
				const groupLines = reportData.lineResults.filter(
					r => r.line.parentLineId === line.id
				);
				
				lineValue = groupLines.reduce((sum, child) => sum + child.value, 0);
				break;
		}
		
		// Add result
		reportData.lineResults.push({
			line,
			value: lineValue
		});
	}
	
	return reportData;
}

// Function to calculate account balances within a date range
async function calculateAccountsBalance(accountIds, startDate, endDate) {
	// Get all journal entries within date range
	const journalLines = await db
		.select({
			accountId: journalEntryLine.accountId,
			debitSum: sql<number>`COALESCE(SUM(${journalEntryLine.debitAmount}), 0)`,
			creditSum: sql<number>`COALESCE(SUM(${journalEntryLine.creditAmount}), 0)`
		})
		.from(journalEntryLine)
		.innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
		.where(
			and(
				journalEntryLine.accountId.in(accountIds),
				gte(journalEntry.date, startDate),
				lte(journalEntry.date, endDate),
				eq(journalEntry.status, 'POSTED')
			)
		)
		.groupBy(journalEntryLine.accountId);
	
	// Get account details to determine normal balance
	const accountsInfo = await db.query.chartOfAccount.findMany({
		where: chartOfAccount.id.in(accountIds),
		with: {
			accountType: true
		}
	});
	
	// Calculate total balance based on normal balance direction
	let totalBalance = 0;
	
	for (const line of journalLines) {
		const account = accountsInfo.find(a => a.id === line.accountId);
		
		if (account) {
			if (account.accountType.normalBalance === 'DEBIT') {
				totalBalance += Number(line.debitSum) - Number(line.creditSum);
			} else {
				totalBalance += Number(line.creditSum) - Number(line.debitSum);
			}
		}
	}
	
	return totalBalance;
}