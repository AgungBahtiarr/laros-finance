import { db } from '$lib/server/db';
import { chartOfAccount, accountType } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
    try {
        // Get all parent accounts (level 1 accounts as groups)
        const groups = await db.query.chartOfAccount.findMany({
            where: eq(chartOfAccount.level, 1),
            with: {
                accountType: true
            },
            orderBy: (chartOfAccount, { asc }) => [asc(chartOfAccount.code)]
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
            const existingGroup = await db.query.chartOfAccount.findFirst({
                where: eq(chartOfAccount.code, code)
            });

            if (existingGroup) {
                return fail(400, {
                    error: `Account group with code ${code} already exists`,
                    values: Object.fromEntries(formData)
                });
            }

            await db.insert(chartOfAccount).values({
                code,
                name,
                description,
                accountTypeId,
                level: 1,
                isActive: true,
                isLocked: false
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
            const existingGroup = await db.query.chartOfAccount.findFirst({
                where: eq(chartOfAccount.code, code)
            });

            if (existingGroup && existingGroup.id !== id) {
                return fail(400, {
                    error: `Account group with code ${code} already exists`,
                    values: Object.fromEntries(formData)
                });
            }

            await db.update(chartOfAccount)
                .set({
                    code,
                    name,
                    description,
                    accountTypeId,
                    isActive,
                    updatedAt: new Date()
                })
                .where(eq(chartOfAccount.id, id));

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
            // Check if the group has child accounts
            const childAccounts = await db.query.chartOfAccount.findMany({
                where: eq(chartOfAccount.parentId, id)
            });

            if (childAccounts && childAccounts.length > 0) {
                return fail(400, {
                    error: 'Cannot delete group that has child accounts'
                });
            }

            await db.delete(chartOfAccount).where(eq(chartOfAccount.id, id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting account group:', error);
            return fail(500, {
                error: 'Failed to delete account group'
            });
        }
    }
};