<script>
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { onMount } from 'svelte';

	onMount(async () => {
		const session = await authClient.getSession();
		if (session.data) {
			goto('/dashboard');
		}
	});

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let isLoading = $state(false);

	async function handleLogin(event) {
		event.preventDefault();
		isLoading = true;
		error = '';

		try {
			const result = await authClient.signIn.username({ username, password });
			if (!result.error) {
				goto('/dashboard');
			} else {
				error = result.error.message || 'Login gagal. Periksa username atau password.';
			}
		} catch (err) {
			error = err.message || 'Terjadi kesalahan saat login.';
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
						<label class="label" for="username">
							<span class="label-text font-medium">Username</span>
						</label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 text-gray-400"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="text"
								id="username"
								name="username"
								placeholder="Masukkan username"
								class="input input-bordered w-full pl-10"
								bind:value={username}
								required
							/>
						</div>
					</div>

					<div class="form-control">
						<label class="label" for="password">
							<span class="label-text font-medium">Password</span>
						</label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 text-gray-400"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="password"
								id="password"
								name="password"
								placeholder="Masukkan password"
								class="input input-bordered w-full pl-10"
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
