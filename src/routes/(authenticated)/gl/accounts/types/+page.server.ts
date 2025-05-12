import { db } from '$lib/server/db';
import { accountType } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
    try {
        const types = await db.query.accountType.findMany({
            orderBy: (accountType, { asc }) => [asc(accountType.code)]
        });

        return {
            accountTypes: types
        };
    } catch (error) {
        console.error('Error loading account types:', error);
        return {
            accountTypes: [],
            error: 'Failed to load account types'
        };
    }
};

export const actions: Actions = {
    create: async ({ request }) => {
        const formData = await request.formData();
        const code = (formData.get('code') as string).toUpperCase();
        const name = formData.get('name') as string;
        const normalBalance = (formData.get('normalBalance') as string).toUpperCase();

        try {
            // Check if code already exists
            const existingType = await db.query.accountType.findFirst({
                where: eq(accountType.code, code)
            });

            if (existingType) {
                return fail(400, {
                    error: `Account type with code ${code} already exists`,
                    values: Object.fromEntries(formData)
                });
            }

            await db.insert(accountType).values({
                code,
                name,
                normalBalance
            });

            return { success: true };
        } catch (error) {
            console.error('Error creating account type:', error);
            return fail(500, {
                error: 'Failed to create account type',
                values: Object.fromEntries(formData)
            });
        }
    },

    update: async ({ request }) => {
        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);
        const code = (formData.get('code') as string).toUpperCase();
        const name = formData.get('name') as string;
        const normalBalance = (formData.get('normalBalance') as string).toUpperCase();

        try {
            // Check if code already exists but with different id
            const existingType = await db.query.accountType.findFirst({
                where: eq(accountType.code, code)
            });

            if (existingType && existingType.id !== id) {
                return fail(400, {
                    error: `Account type with code ${code} already exists`,
                    values: Object.fromEntries(formData)
                });
            }

            await db.update(accountType)
                .set({
                    code,
                    name,
                    normalBalance,
                    updatedAt: new Date()
                })
                .where(eq(accountType.id, id));

            return { success: true };
        } catch (error) {
            console.error('Error updating account type:', error);
            return fail(500, {
                error: 'Failed to update account type',
                values: Object.fromEntries(formData)
            });
        }
    },

    delete: async ({ request }) => {
        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);

        try {
            // Check if the account type is in use
            const accounts = await db.query.chartOfAccount.findMany({
                where: eq(accountType.id, id)
            });

            if (accounts && accounts.length > 0) {
                return fail(400, {
                    error: 'Cannot delete account type that is in use by accounts'
                });
            }

            await db.delete(accountType).where(eq(accountType.id, id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting account type:', error);
            return fail(500, {
                error: 'Failed to delete account type'
            });
        }
    }
};