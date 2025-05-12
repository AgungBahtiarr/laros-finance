<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft, Edit, Plus, Trash2, AlertTriangle } from '@lucide/svelte';

	let { data } = $props();
	let searchTerm = $state('');
	let showModal = $state(false);
	let isEditing = $state(false);
	let currentType = $state({
		id: '',
		code: '',
		name: '',
		normalBalance: 'DEBIT'
	});

	// Filtered account types
	let filteredTypes = $derived(
		data.accountTypes.filter((type) =>
			type.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
			type.name.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	// Open modal for creating a new account type
	function openCreateModal() {
		isEditing = false;
		currentType = {
			id: '',
			code: '',
			name: '',
			normalBalance: 'DEBIT'
		};
		showModal = true;
	}

	// Open modal for editing an account type
	function openEditModal(type) {
		isEditing = true;
		currentType = {
			id: type.id.toString(),
			code: type.code,
			name: type.name,
			normalBalance: type.normalBalance
		};
		showModal = true;
	}

	// Close the modal
	function closeModal() {
		showModal = false;
	}

	// Handle form submission for create/update
	function handleSubmit() {
		return async ({ result }) => {
			if (result.type === 'success') {
				closeModal();
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Handle delete form submission
	function handleDelete() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Determine color for normal balance badge
	function getBalanceColor(balance) {
		return balance === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<div class="flex items-center gap-2">
				<a href="/gl/accounts" class="btn btn-ghost btn-sm px-2">
					<ArrowLeft class="h-4 w-4" />
				</a>
				<h1 class="text-2xl font-bold text-gray-900">Account Types</h1>
			</div>
			<p class="text-sm text-gray-500">Manage account type classifications</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-primary btn-sm gap-1" onclick={openCreateModal}>
				<Plus class="h-4 w-4" />
				Add Account Type
			</button>
		</div>
	</div>

	<!-- Search -->
	<div class="flex flex-col gap-4 sm:flex-row">
		<div class="flex-1">
			<input
				type="text"
				placeholder="Search by code or name..."
				class="input input-bordered w-full"
				bind:value={searchTerm}
			/>
		</div>
	</div>

	<!-- Account Types Table -->
	<div class="card bg-base-100 border">
		<div class="overflow-x-auto">
			<table class="table">
				<thead class="bg-base-200">
					<tr>
						<th class="w-32">Code</th>
						<th>Name</th>
						<th>Normal Balance</th>
						<th class="w-24 text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredTypes as type}
						<tr class="hover">
							<td class="font-mono font-medium">{type.code}</td>
							<td>{type.name}</td>
							<td>
								<div class={`badge ${getBalanceColor(type.normalBalance)}`}>
									{type.normalBalance}
								</div>
							</td>
							<td>
								<div class="flex justify-center gap-1">
									<button
										class="btn btn-ghost btn-sm text-primary"
										onclick={() => openEditModal(type)}
									>
										<Edit class="h-4 w-4" />
									</button>
									<form method="POST" action="?/delete" use:enhance={handleDelete}>
										<input type="hidden" name="id" value={type.id} />
										<button
											type="submit"
											class="btn btn-ghost btn-sm text-error"
											onclick={(e) => {
												if (!confirm('Are you sure you want to delete this account type?')) {
													e.preventDefault();
												}
											}}
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}

					{#if filteredTypes.length === 0}
						<tr>
							<td colspan="4" class="py-8 text-center text-gray-500">
								{searchTerm
									? 'No account types match your search criteria'
									: 'No account types found'}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Quick Help -->
	<div class="alert alert-info">
		<AlertTriangle class="h-5 w-5" />
		<div>
			<div class="font-bold">About Account Types</div>
			<div class="text-xs">
				Account types classify accounts by their fundamental nature. Each account type has a normal
				balance, which determines whether debits or credits increase the account balance.
			</div>
		</div>
	</div>
</div>

<!-- Account Type Modal -->
{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-md">
			<h3 class="text-lg font-bold">
				{isEditing ? 'Edit Account Type' : 'Create Account Type'}
			</h3>
			<form
				method="POST"
				action={isEditing ? '?/update' : '?/create'}
				use:enhance={handleSubmit}
				class="mt-4 space-y-4"
			>
				{#if isEditing}
					<input type="hidden" name="id" value={currentType.id} />
				{/if}

				<div class="form-control">
					<label class="label" for="code">
						<span class="label-text">Code</span>
					</label>
					<input
						type="text"
						id="code"
						name="code"
						class="input input-bordered"
						placeholder="e.g. ASSET"
						maxlength="10"
						required
						bind:value={currentType.code}
					/>
					<label class="label">
						<span class="label-text-alt">Unique identifier for the account type</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label" for="name">
						<span class="label-text">Name</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						class="input input-bordered"
						placeholder="e.g. Asset"
						maxlength="100"
						required
						bind:value={currentType.name}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="normalBalance">
						<span class="label-text">Normal Balance</span>
					</label>
					<select
						id="normalBalance"
						name="normalBalance"
						class="select select-bordered"
						required
						bind:value={currentType.normalBalance}
					>
						<option value="DEBIT">DEBIT</option>
						<option value="CREDIT">CREDIT</option>
					</select>
					<label class="label">
						<span class="label-text-alt">The side that increases this account type's balance</span>
					</label>
				</div>

				<div class="modal-action">
					<button type="submit" class="btn btn-primary">
						{isEditing ? 'Update' : 'Create'}
					</button>
					<button type="button" class="btn" onclick={closeModal}>Cancel</button>
				</div>
			</form>
		</div>
		<div 
			class="modal-backdrop" 
			onclick={closeModal} 
			role="button" 
			tabindex="0" 
			onkeydown={(e) => e.key === 'Enter' && closeModal()}
		></div>
	</div>
{/if}