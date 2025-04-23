<script>
	let { data, form } = $props();
	let error = form?.error ?? '';
</script>

<div class="bg-base-200 flex min-h-screen items-center justify-center">
	<div class="card bg-base-100 w-96 shadow-xl">
		<div class="card-body">
			<h2 class="card-title mb-6 text-center text-2xl font-bold">Login Laros Finance</h2>

			{#if error}
				<div class="alert alert-error mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
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

			<form method="POST" action="?/create" class="space-y-4">
				<div class="form-control">
					<label class="label" for="username">
						<span class="label-text">Username</span>
					</label>
					<input
						type="text"
						name="username"
						placeholder="Masukkan username"
						class="input input-bordered w-full"
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="password">
						<span class="label-text">Password</span>
					</label>
					<input
						type="password"
						name="password"
						placeholder="Masukkan password"
						class="input input-bordered w-full"
						required
					/>
				</div>
				<div class="form-control mt-6">
					<button type="submit" class="btn btn-primary w-full">Masuk</button>
				</div>
			</form>

			<div class="divider">ATAU</div>

			<div class="space-y-2 text-center">
				<a href="/auth/forgot-password" class="link link-hover text-sm">Lupa password? </a>
			</div>
		</div>
	</div>
</div>
