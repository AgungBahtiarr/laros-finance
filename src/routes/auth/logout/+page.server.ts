import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

export const GET = async ({ request }) => {
	await auth.api.signOut({ headers: request.headers });
	throw redirect(302, '/auth/login');
};
