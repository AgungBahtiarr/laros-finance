import { auth } from '$lib/auth';
import { redirect, fail } from '@sveltejs/kit';

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const username = data.get('username');
		const password = data.get('password');
		const result = await auth.api.signInUsername({
			body: { username, password },
			asResponse: true,
			headers: request.headers
		});

		const session = await auth.api.getSession({
			headers: request.headers
		});

		console.log(session);

		if (result.ok) {
			return redirect(302, '/dashboard');
		} else {
			return fail(400, {
				error: 'Username atau password salah'
			});
		}
	}
};
