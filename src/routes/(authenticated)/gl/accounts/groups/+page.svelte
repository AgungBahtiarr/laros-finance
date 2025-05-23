<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft, Edit, Plus, Trash2, AlertTriangle, ToggleLeft } from '@lucide/svelte';

	let { data } = $props();
	let searchTerm = $state('');
	let showModal = $state(false);
	let isEditing = $state(false);
	let currentGroup = $state({
		id: '',
		code: '',
		name: '',
		description: '',
		accountTypeId: '',
		balanceType: 'DEBIT',
		isActive: true
	});

	// Filtered account groups
	let filteredGroups = $derived(
		data.groups.filter(
			(group) =>
				group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
				group.name.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	// Open modal for creating a new account group
	function openCreateModal() {
		isEditing = false;
		currentGroup = {
			id: '',
			code: '',
			name: '',
			description: '',
			accountTypeId: '',
			balanceType: 'DEBIT',
			isActive: true
		};
		showModal = true;
	}

	// Open modal for editing an account group
	function openEditModal(group) {
		isEditing = true;
		currentGroup = {
			id: group.id.toString(),
			code: group.code,
			name: group.name,
			description: group.description || '',
			accountTypeId: group.accountTypeId.toString(),
			balanceType: group.balanceType,
			isActive: group.isActive
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

	// Handle toggle status
	function handleToggleStatus() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Get the color for account type
	function getAccountTypeColor(typeCode) {
		const colors = {
			ASSET: 'bg-blue-100 text-blue-800',
			LIABILITY: 'bg-red-100 text-red-800',
			EQUITY: 'bg-purple-100 text-purple-800',
			REVENUE: 'bg-green-100 text-green-800',
			EXPENSE: 'bg-orange-100 text-orange-800'
		};
		return colors[typeCode] || 'bg-gray-100 text-gray-800';
	}

	// Get the color for balance type
	function getBalanceTypeColor(balanceType) {
		return balanceType === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<div class="flex items-center gap-2">
				<a href="/gl/accounts" class="btn btn-ghost btn-sm px-2">
					<ArrowLeft class="h-4 w-4" />
				</a>
				<h1 class="text-2xl font-bold text-gray-900">Account Groups</h1>
			</div>
			<p class="text-sm text-gray-500">Kelola semua grup klasifikasi akun</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-primary btn-sm gap-1" onclick={openCreateModal}>
				<Plus class="h-4 w-4" />
				Tambah Grup Akun
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

	<!-- Account Groups Table -->
	<div class="card bg-base-100 border">
		<div class="overflow-x-auto">
			<table class="table">
				<thead class="bg-base-200">
					<tr>
						<th>Code</th>
						<th>Name</th>
						<th>Account Type</th>
						<th>Balance Type</th>
						<th>Status</th>
						<th class="w-32 text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredGroups as group}
						<tr class="hover">
							<td class="font-medium">{group.code}</td>
							<td>
								<div class="font-medium">{group.name}</div>
								{#if group.description}
									<div class="text-xs text-gray-500">{group.description}</div>
								{/if}
							</td>
							<td>
								<div class={`badge ${getAccountTypeColor(group.accountType.code)}`}>
									{group.accountType.name}
								</div>
							</td>
							<td>
								<div class={`badge ${getBalanceTypeColor(group.balanceType)}`}>
									{group.balanceType}
								</div>
							</td>
							<td>
								{#if group.isActive}
									<div class="badge badge-success badge-sm">Active</div>
								{:else}
									<div class="badge badge-ghost badge-sm">Inactive</div>
								{/if}
							</td>
							<td>
								<div class="flex justify-center gap-1">
									<button
										class="btn btn-ghost btn-sm text-primary"
										onclick={() => openEditModal(group)}
									>
										<Edit class="h-4 w-4" />
									</button>
									<form method="POST" action="?/update" use:enhance={handleToggleStatus}>
										<input type="hidden" name="id" value={group.id} />
										<input type="hidden" name="code" value={group.code} />
										<input type="hidden" name="name" value={group.name} />
										<input type="hidden" name="description" value={group.description || ''} />
										<input type="hidden" name="accountTypeId" value={group.accountTypeId} />
										<input type="hidden" name="balanceType" value={group.balanceType} />
										<input type="hidden" name="isActive" value={!group.isActive} />
										<button type="submit" class="btn btn-ghost btn-sm">
											<ToggleLeft class="h-4 w-4" />
										</button>
									</form>
									<form method="POST" action="?/delete" use:enhance={handleDelete}>
										<input type="hidden" name="id" value={group.id} />
										<button
											type="submit"
											class="btn btn-ghost btn-sm text-error"
											onclick={(e) => {
												if (!confirm('Are you sure you want to delete this account group?')) {
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

					{#if filteredGroups.length === 0}
						<tr>
							<td colspan="6" class="py-8 text-center text-gray-500">
								{searchTerm
									? 'No account groups match your search criteria'
									: 'No account groups found'}
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
			<div class="font-bold">About Account Groups</div>
			<div class="text-xs">
				Account groups classify accounts by their financial purpose. Each account group belongs to
				an account type (Asset, Liability, etc.) and has a normal balance direction (Debit or
				Credit) that determines how account balances are calculated.
			</div>
		</div>
	</div>
</div>

<!-- Account Group Modal -->
{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-md">
			<h3 class="text-lg font-bold">
				{isEditing ? 'Edit Account Group' : 'Create Account Group'}
			</h3>
			<form
				method="POST"
				action={isEditing ? '?/update' : '?/create'}
				use:enhance={handleSubmit}
				class="mt-4 space-y-4"
			>
				{#if isEditing}
					<input type="hidden" name="id" value={currentGroup.id} />
				{/if}

				<div class="form-control">
					<label class="label" for="code">
						<span class="label-text">Group Code</span>
					</label>
					<input
						type="text"
						id="code"
						name="code"
						class="input input-bordered"
						placeholder="e.g. CASH_AND_EQUIV"
						maxlength="20"
						required
						bind:value={currentGroup.code}
					/>
					<label class="label">
						<span class="label-text-alt">Unique identifier for the account group</span>
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
						placeholder="e.g. Cash and Cash Equivalents"
						maxlength="100"
						required
						bind:value={currentGroup.name}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="accountTypeId">
						<span class="label-text">Account Type</span>
					</label>
					<select
						id="accountTypeId"
						name="accountTypeId"
						class="select select-bordered"
						required
						bind:value={currentGroup.accountTypeId}
					>
						<option value="">Select Account Type</option>
						{#each data.accountTypes as type}
							<option value={type.id}>{type.name}</option>
						{/each}
					</select>
				</div>

				<div class="form-control">
					<label class="label" for="balanceType">
						<span class="label-text">Balance Type</span>
					</label>
					<select
						id="balanceType"
						name="balanceType"
						class="select select-bordered"
						required
						bind:value={currentGroup.balanceType}
					>
						<option value="DEBIT">DEBIT</option>
						<option value="CREDIT">CREDIT</option>
					</select>
					<label class="label">
						<span class="label-text-alt">Normal balance direction for this account group</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label" for="description">
						<span class="label-text">Description</span>
					</label>
					<textarea
						id="description"
						name="description"
						class="textarea textarea-bordered"
						rows="3"
						placeholder="Optional description"
						bind:value={currentGroup.description}
					></textarea>
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
