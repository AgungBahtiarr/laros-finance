import { verifyMailCredentials } from '$lib/auth';
import { json, error } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const formData = await request.formData();

		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			throw error(400, {
				message: 'Email dan password harus diisi'
			});
		}

		if (typeof email !== 'string' || typeof password !== 'string') {
			throw error(400, {
				message: 'Email dan password harus berupa string'
			});
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw error(400, {
				message: 'Format email tidak valid'
			});
		}

		if (password.length < 6) {
			throw error(400, {
				message: 'Password minimal 6 karakter'
			});
		}

		const mail = await verifyMailCredentials(email, password);

		if (!mail.success) {
			throw error(401, {
				message: 'Email atau password salah'
			});
		}

		return json({
			success: true,
			message: 'Mail authentication berhasil',
			data: {
				email,
				mail
			}
		});
	} catch (err) {
		if (err?.status) {
			throw err;
		}
		console.error('Mail auth error:', err);

		if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
			throw error(503, {
				message: 'Layanan tidak tersedia, coba lagi nanti'
			});
		}

		if (err?.message?.includes('timeout')) {
			throw error(408, {
				message: 'Request timeout, coba lagi'
			});
		}

		if (err?.message?.includes('unauthorized') || err?.message?.includes('invalid')) {
			throw error(401, {
				message: 'Email atau password salah'
			});
		}

		throw error(500, {
			message: 'Terjadi kesalahan internal server'
		});
	}
}
