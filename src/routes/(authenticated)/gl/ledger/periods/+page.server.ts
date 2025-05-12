import { db } from '$lib/server/db';
import { fiscalPeriod } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	try {
		// Get all fiscal periods
		const periods = await db.query.fiscalPeriod.findMany({
			orderBy: [desc(fiscalPeriod.startDate)]
		});

		// Identify current period (first non-closed period)
		const currentPeriod = periods.find(period => !period.isClosed);

		return {
			periods,
			currentPeriod
		};
	} catch (err) {
		console.error('Error loading fiscal periods:', err);
		throw error(500, 'Failed to load fiscal periods');
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		
		const name = formData.get('name') as string;
		const startDateStr = formData.get('startDate') as string;
		const endDateStr = formData.get('endDate') as string;
		
		const startDate = new Date(startDateStr);
		const endDate = new Date(endDateStr);
		
		try {
			// Validate dates
			if (startDate > endDate) {
				return fail(400, {
					error: 'Start date must be before end date',
					values: Object.fromEntries(formData)
				});
			}
			
			// Check for overlapping periods
			const existingPeriods = await db.query.fiscalPeriod.findMany({
				where: and(
					lte(fiscalPeriod.startDate, endDate),
					gte(fiscalPeriod.endDate, startDate)
				)
			});
			
			if (existingPeriods.length > 0) {
				return fail(400, {
					error: 'This period overlaps with existing periods',
					values: Object.fromEntries(formData)
				});
			}
			
			await db.insert(fiscalPeriod).values({
				name,
				startDate,
				endDate,
				isClosed: false
			});
			
			return { success: true };
		} catch (err) {
			console.error('Error creating fiscal period:', err);
			return fail(500, {
				error: 'Failed to create fiscal period',
				values: Object.fromEntries(formData)
			});
		}
	},
	
	update: async ({ request }) => {
		const formData = await request.formData();
		
		const id = parseInt(formData.get('id') as string);
		const name = formData.get('name') as string;
		const startDateStr = formData.get('startDate') as string;
		const endDateStr = formData.get('endDate') as string;
		const isClosed = formData.get('isClosed') === 'true';
		
		const startDate = new Date(startDateStr);
		const endDate = new Date(endDateStr);
		
		try {
			// Validate dates
			if (startDate > endDate) {
				return fail(400, {
					error: 'Start date must be before end date',
					values: Object.fromEntries(formData)
				});
			}
			
			// Check for overlapping periods (excluding this period)
			const existingPeriods = await db.query.fiscalPeriod.findMany({
				where: and(
					lte(fiscalPeriod.startDate, endDate),
					gte(fiscalPeriod.endDate, startDate),
					eq(fiscalPeriod.id, id)
				)
			});
			
			if (existingPeriods.length > 0) {
				return fail(400, {
					error: 'This period overlaps with existing periods',
					values: Object.fromEntries(formData)
				});
			}
			
			await db.update(fiscalPeriod)
				.set({
					name,
					startDate,
					endDate,
					isClosed,
					updatedAt: new Date()
				})
				.where(eq(fiscalPeriod.id, id));
			
			return { success: true };
		} catch (err) {
			console.error('Error updating fiscal period:', err);
			return fail(500, {
				error: 'Failed to update fiscal period',
				values: Object.fromEntries(formData)
			});
		}
	},
	
	close: async ({ request }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);
		
		try {
			// Check if there are any open journal entries for this period
			// This would require checking journal entry table
			
			await db.update(fiscalPeriod)
				.set({
					isClosed: true,
					updatedAt: new Date()
				})
				.where(eq(fiscalPeriod.id, id));
			
			return { success: true };
		} catch (err) {
			console.error('Error closing fiscal period:', err);
			return fail(500, { error: 'Failed to close fiscal period' });
		}
	},
	
	reopen: async ({ request }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);
		
		try {
			// Check if this is the most recent closed period
			const periods = await db.query.fiscalPeriod.findMany({
				orderBy: [desc(fiscalPeriod.endDate)]
			});
			
			const mostRecentClosedPeriod = periods.find(period => period.isClosed);
			
			if (!mostRecentClosedPeriod || mostRecentClosedPeriod.id !== id) {
				return fail(400, { error: 'Only the most recent closed period can be reopened' });
			}
			
			await db.update(fiscalPeriod)
				.set({
					isClosed: false,
					updatedAt: new Date()
				})
				.where(eq(fiscalPeriod.id, id));
			
			return { success: true };
		} catch (err) {
			console.error('Error reopening fiscal period:', err);
			return fail(500, { error: 'Failed to reopen fiscal period' });
		}
	}
};