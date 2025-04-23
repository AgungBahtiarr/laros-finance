import { dev } from '$app/environment';
import { auth } from '$lib/auth';
import { redirect, fail } from '@sveltejs/kit';

export const actions = {
	create: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username');
		const password = data.get('password');
		const result = await auth.api.signInUsername({
			body: { username, password },
			asResponse: true,
			headers: request.headers
		});

		const setCookieHeader = result.headers.get('set-cookie');
		if (setCookieHeader) {
			const parsedCookie = setCookieHeader.split(';')[0];
			const [name, encodedValue] = parsedCookie.split('=');

			const decodedValue = decodeURIComponent(encodedValue);
			cookies.set(name, decodedValue, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 604800,
				secure: !dev
			});
		}

		if (result.ok) {
			return redirect(302, '/dashboard');
		} else {
			return fail(400, {
				error: 'Username atau password salah'
			});
		}
	}
};
