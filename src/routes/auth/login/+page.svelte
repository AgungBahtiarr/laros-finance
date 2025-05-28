<script>
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { onMount } from 'svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let isLoading = $state(false);

	onMount(async () => {
		try {
			const session = await authClient.getSession();
			if (session.data) {
				goto('/dashboard');
			}
		} catch (err) {
			console.error('Error checking session:', err);
		}
	});

	function extractUsername(email) {
		return email.split('@')[0] || email;
	}

	async function checkMailAPI(email, password) {
		try {
			const formData = new FormData();
			formData.append('email', email);
			formData.append('password', password);

			const response = await fetch(`${import.meta.env.BASE_URL}/api/auth-mail`, {
				method: 'POST',
				body: formData
			});

			return response.status === 200;
		} catch (err) {
			return false;
		}
	}

	async function attemptSignUp(email, password, username) {
		try {
			const user = await authClient.signUp.email({
				name: username,
				email: email,
				username: username,
				displayUsername: username,
				password: password
			});

			return { success: !user.error, error: user.error };
		} catch (err) {
			return { success: false, error: err };
		}
	}

	async function attemptSignIn(email, password) {
		try {
			const result = await authClient.signIn.email({ email, password });
			return { success: true, result };
		} catch (err) {
			return { success: false, error: err };
		}
	}

	async function handleLogin(event) {
		event.preventDefault();

		isLoading = true;
		error = '';

		try {
			const username = extractUsername(email);

			const [isMailValid, signUpResult] = await Promise.all([
				checkMailAPI(email, password),
				attemptSignUp(email, password, username)
			]);

			console.log('Sign up result:', signUpResult);

			const signInResult = await attemptSignIn(email, password);

			if (signInResult.success) {
				goto('/dashboard');
			} else {
				error = signInResult.error?.message || 'Login gagal. Periksa email atau password.';
			}
		} catch (err) {
			error = 'Terjadi kesalahan. Silakan coba lagi.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div
	class="from-base-100 to-base-200 flex min-h-screen items-center justify-center bg-gradient-to-br"
>
	<div class="w-full max-w-md px-4">
		<div class="card bg-base-100 border shadow-xl">
			<div class="-mt-10 flex justify-center">
				<div
					class="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full p-2 ring-4 ring-white"
				>
					<img src="/images/laros-logo.png" alt="Laros Logo" class="h-16 w-16 object-contain" />
				</div>
			</div>

			<div class="card-body pt-5">
				<h2 class="text-center text-2xl font-bold text-gray-900">Laros Finance</h2>
				<p class="mb-6 text-center text-sm text-gray-600">Silakan login untuk melanjutkan</p>

				{#if error}
					<div class="alert alert-error mb-4 text-sm">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{error}</span>
					</div>
				{/if}

				<form onsubmit={handleLogin} class="space-y-4">
					<div class="form-control">
						<label class="label" for="email">
							<span class="label-text font-medium">email</span>
						</label>
						<div class="relative">
							<input
								type="text"
								id="email"
								name="email"
								placeholder="Masukkan email"
								class="input input-bordered w-full"
								bind:value={email}
								required
							/>
						</div>
					</div>

					<div class="form-control">
						<label class="label" for="password">
							<span class="label-text font-medium">Password</span>
						</label>
						<div class="relative">
							<input
								type="password"
								id="password"
								name="password"
								placeholder="Masukkan password"
								class="input input-bordered w-full"
								bind:value={password}
								required
							/>
						</div>
					</div>

					<div class="form-control mt-8">
						<button type="submit" class="btn btn-primary w-full" disabled={isLoading}>
							{#if isLoading}
								<span class="loading loading-spinner loading-sm"></span>
								Memproses...
							{:else}
								Masuk
							{/if}
						</button>
					</div>
				</form>

				<div class="mt-6 text-center text-sm text-gray-600">
					<p>© {new Date().getFullYear()} PT Lare Osing Ndo. All rights reserved.</p>
				</div>
			</div>
		</div>
	</div>
</div>
