import { db } from '$lib/server/db';
import { fiscalPeriod } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { eq, and, desc, asc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	try {
		// Get all fiscal periods
		const periods = await db.query.fiscalPeriod.findMany({
			orderBy: [desc(fiscalPeriod.year), desc(fiscalPeriod.month)]
		});

		// Identify current period (first non-closed period)
		const currentPeriod = periods.find((period) => !period.isClosed);

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
		const year = parseInt(formData.get('year') as string);
		const month = parseInt(formData.get('month') as string);

		try {
			// Validate year and month
			if (year < 2000 || year > 2100) {
				return fail(400, {
					error: 'Year must be between 2000 and 2100',
					values: Object.fromEntries(formData)
				});
			}

			if (month < 1 || month > 12) {
				return fail(400, {
					error: 'Month must be between 1 and 12',
					values: Object.fromEntries(formData)
				});
			}

			// Check if period already exists
			const existingPeriod = await db.query.fiscalPeriod.findFirst({
				where: and(eq(fiscalPeriod.year, year), eq(fiscalPeriod.month, month))
			});

			if (existingPeriod) {
				return fail(400, {
					error: 'A fiscal period for this year and month already exists',
					values: Object.fromEntries(formData)
				});
			}

			await db.insert(fiscalPeriod).values({
				name,
				year,
				month,
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
		const year = parseInt(formData.get('year') as string);
		const month = parseInt(formData.get('month') as string);
		const isClosed = formData.get('isClosed') === 'true';

		try {
			// Validate year and month
			if (year < 2000 || year > 2100) {
				return fail(400, {
					error: 'Year must be between 2000 and 2100',
					values: Object.fromEntries(formData)
				});
			}

			if (month < 1 || month > 12) {
				return fail(400, {
					error: 'Month must be between 1 and 12',
					values: Object.fromEntries(formData)
				});
			}

			// Check if another period exists with same year and month (excluding current)
			const existingPeriod = await db.query.fiscalPeriod.findFirst({
				where: and(
					eq(fiscalPeriod.year, year),
					eq(fiscalPeriod.month, month),
					eq(fiscalPeriod.id, id)
				)
			});

			if (existingPeriod && existingPeriod.id !== id) {
				return fail(400, {
					error: 'A fiscal period for this year and month already exists',
					values: Object.fromEntries(formData)
				});
			}

			await db
				.update(fiscalPeriod)
				.set({
					name,
					year,
					month,
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

			await db
				.update(fiscalPeriod)
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
				orderBy: [desc(fiscalPeriod.year), desc(fiscalPeriod.month)]
			});

			const mostRecentClosedPeriod = periods.find((period) => period.isClosed);

			if (!mostRecentClosedPeriod || mostRecentClosedPeriod.id !== id) {
				return fail(400, { error: 'Only the most recent closed period can be reopened' });
			}

			await db
				.update(fiscalPeriod)
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
