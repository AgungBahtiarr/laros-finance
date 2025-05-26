import { db } from '$lib/server/db';
import { accountGroup, accountType } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	try {
		// Get all account groups
		const groups = await db.query.accountGroup.findMany({
			with: {
				accountType: true
			},
			orderBy: (accountGroup, { asc }) => [asc(accountGroup.code)]
		});

		// Get all account types for the form
		const accountTypes = await db.query.accountType.findMany({
			orderBy: (accountType, { asc }) => [asc(accountType.name)]
		});

		return {
			groups,
			accountTypes
		};
	} catch (error) {
		console.error('Error loading account groups:', error);
		return {
			groups: [],
			accountTypes: [],
			error: 'Failed to load account groups'
		};
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const accountTypeId = parseInt(formData.get('accountTypeId') as string);

		try {
			// Check if code already exists
			const existingGroup = await db.query.accountGroup.findFirst({
				where: eq(accountGroup.code, code)
			});

			if (existingGroup) {
				return fail(400, {
					error: `Account group with code ${code} already exists`,
					values: Object.fromEntries(formData)
				});
			}

			await db.insert(accountGroup).values({
				code,
				name,
				description,
				accountTypeId,
				isActive: true
			});

			return { success: true };
		} catch (error) {
			console.error('Error creating account group:', error);
			return fail(500, {
				error: 'Failed to create account group',
				values: Object.fromEntries(formData)
			});
		}
	},

	update: async ({ request }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);
		const code = formData.get('code') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const accountTypeId = parseInt(formData.get('accountTypeId') as string);
		const isActive = formData.get('isActive') === 'true';

		try {
			// Check if code already exists but with different id
			const existingGroup = await db.query.accountGroup.findFirst({
				where: eq(accountGroup.code, code)
			});

			if (existingGroup && existingGroup.id !== id) {
				return fail(400, {
					error: `Account group with code ${code} already exists`,
					values: Object.fromEntries(formData)
				});
			}

			await db
				.update(accountGroup)
				.set({
					code,
					name,
					description,
					accountTypeId,
					isActive,
					updatedAt: new Date()
				})
				.where(eq(accountGroup.id, id));

			return { success: true };
		} catch (error) {
			console.error('Error updating account group:', error);
			return fail(500, {
				error: 'Failed to update account group',
				values: Object.fromEntries(formData)
			});
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);

		try {
			// Check if the group is referenced by any accounts
			const accountsUsingGroup = await db.query.chartOfAccount.findMany({
				where: eq(accountGroup.id, id)
			});

			if (accountsUsingGroup && accountsUsingGroup.length > 0) {
				return fail(400, {
					error: 'Cannot delete group that is used by accounts'
				});
			}

			await db.delete(accountGroup).where(eq(accountGroup.id, id));
			return { success: true };
		} catch (error) {
			console.error('Error deleting account group:', error);
			return fail(500, {
				error: 'Failed to delete account group'
			});
		}
	}
};
