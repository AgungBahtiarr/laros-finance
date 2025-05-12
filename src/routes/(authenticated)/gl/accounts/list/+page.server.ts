import { db } from '$lib/server/db';
import { chartOfAccount, accountType } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { eq, asc, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	try {
		// Get all accounts with their related account type and parent
		const accounts = await db.query.chartOfAccount.findMany({
			with: {
				accountType: true,
				parent: true
			},
			orderBy: [asc(chartOfAccount.code)]
		});

		// Get all account types for the form
		const accountTypes = await db.query.accountType.findMany({
			orderBy: [asc(accountType.name)]
		});

		// Transform accounts into a hierarchical structure
		const accountHierarchy = buildAccountHierarchy(accounts);

		return {
			accounts,
			accountHierarchy,
			accountTypes
		};
	} catch (err) {
		console.error('Error loading accounts:', err);
		throw error(500, 'Failed to load chart of accounts');
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		
		const code = formData.get('code') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const accountTypeId = parseInt(formData.get('accountTypeId') as string);
		const parentId = formData.get('parentId') ? parseInt(formData.get('parentId') as string) : null;
		const level = parentId ? parseInt(formData.get('level') as string) : 1;
		
		try {
			// Check if code already exists
			const existingAccount = await db.query.chartOfAccount.findFirst({
				where: eq(chartOfAccount.code, code)
			});
			
			if (existingAccount) {
				return fail(400, { 
					error: 'Account code already exists',
					values: Object.fromEntries(formData)
				});
			}
			
			await db.insert(chartOfAccount).values({
				code,
				name,
				description,
				accountTypeId,
				parentId,
				level,
				isActive: true,
				isLocked: false
			});
			
			return { success: true };
		} catch (err) {
			console.error('Error creating account:', err);
			return fail(500, { 
				error: 'Failed to create account',
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
		const parentId = formData.get('parentId') ? parseInt(formData.get('parentId') as string) : null;
		const level = parentId ? parseInt(formData.get('level') as string) : 1;
		const isActive = formData.get('isActive') === 'true';
		
		try {
			// Check if code exists but belongs to a different account
			const existingAccount = await db.query.chartOfAccount.findFirst({
				where: eq(chartOfAccount.code, code)
			});
			
			if (existingAccount && existingAccount.id !== id) {
				return fail(400, { 
					error: 'Account code already exists',
					values: Object.fromEntries(formData)
				});
			}
			
			await db.update(chartOfAccount)
				.set({
					code,
					name,
					description,
					accountTypeId,
					parentId,
					level,
					isActive,
					updatedAt: new Date()
				})
				.where(eq(chartOfAccount.id, id));
			
			return { success: true };
		} catch (err) {
			console.error('Error updating account:', err);
			return fail(500, { 
				error: 'Failed to update account',
				values: Object.fromEntries(formData)
			});
		}
	},
	
	toggleStatus: async ({ request }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);
		const currentStatus = formData.get('isActive') === 'true';
		
		try {
			await db.update(chartOfAccount)
				.set({
					isActive: !currentStatus,
					updatedAt: new Date()
				})
				.where(eq(chartOfAccount.id, id));
			
			return { success: true };
		} catch (err) {
			console.error('Error toggling account status:', err);
			return fail(500, { error: 'Failed to update account status' });
		}
	},
	
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);
		
		try {
			// Check if account has child accounts
			const children = await db.query.chartOfAccount.findMany({
				where: eq(chartOfAccount.parentId, id)
			});
			
			if (children.length > 0) {
				return fail(400, { error: 'Cannot delete account with child accounts' });
			}
			
			// Check if account is referenced in journal entries
			// This would require checking journal entry lines
			
			await db.delete(chartOfAccount).where(eq(chartOfAccount.id, id));
			return { success: true };
		} catch (err) {
			console.error('Error deleting account:', err);
			return fail(500, { error: 'Failed to delete account' });
		}
	}
};

// Helper function to build account hierarchy
function buildAccountHierarchy(accounts) {
	// Create a map for quick lookup
	const accountMap = new Map();
	accounts.forEach(account => {
		accountMap.set(account.id, { ...account, children: [] });
	});
	
	// Build the tree
	const rootAccounts = [];
	accounts.forEach(account => {
		const accountWithChildren = accountMap.get(account.id);
		
		if (account.parentId === null) {
			rootAccounts.push(accountWithChildren);
		} else {
			const parent = accountMap.get(account.parentId);
			if (parent) {
				parent.children.push(accountWithChildren);
			}
		}
	});
	
	return rootAccounts;
}