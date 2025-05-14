<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		ArrowLeft,
		ChevronDown,
		ChevronRight,
		Plus,
		Edit,
		Eye,
		ToggleLeft,
		Trash2,
		AlertTriangle
	} from '@lucide/svelte';

	let { data } = $props();
	let searchTerm = $state('');
	let showInactive = $state(false);
	let expandedAccounts = $state(new Set<number>());

	// Form for creating/editing account
	let showForm = $state(false);
	let isEditing = $state(false);
	let formData = $state({
		id: '',
		code: '',
		name: '',
		description: '',
		accountTypeId: '',
		accountGroupId: '',
		parentId: '',
		level: '1',
		balanceType: ''
	});

	// Reference to form element
	let formElement = $state(null);

	// Filtered accounts
	let filteredAccounts = $derived(() => {
		// Filter the flat list of accounts
		return data.accounts.filter((account) => {
			const matchSearch =
				account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
				account.name.toLowerCase().includes(searchTerm.toLowerCase());

			const matchStatus = showInactive ? true : account.isActive;

			return matchSearch && matchStatus;
		});
	});

	// Handle hierarchy expansion
	function toggleExpand(accountId: number) {
		if (expandedAccounts.has(accountId)) {
			expandedAccounts.delete(accountId);
		} else {
			expandedAccounts.add(accountId);
		}
	}

	// Recursively check if account is expanded and matches search term
	function shouldShowAccount(account, searchTerm: string) {
		// Always show if it matches search
		if (
			searchTerm &&
			(account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
				account.name.toLowerCase().includes(searchTerm.toLowerCase()))
		) {
			return true;
		}

		// If parent is not expanded, don't show children
		if (account.parentId && !expandedAccounts.has(account.parentId)) {
			return false;
		}

		// Show based on active state filter
		return showInactive ? true : account.isActive;
	}

	// Open form for creating a new account
	function openCreateForm() {
		isEditing = false;
		formData = {
			id: '',
			code: '',
			name: '',
			description: '',
			accountTypeId: '',
			accountGroupId: '',
			parentId: '',
			level: '1',
			balanceType: ''
		};
		showForm = true;
	}

	// Open form for editing an account
	function openEditForm(account) {
		isEditing = true;
		formData = {
			id: account.id.toString(),
			code: account.code,
			name: account.name,
			description: account.description || '',
			accountTypeId: account.accountTypeId.toString(),
			accountGroupId: account.accountGroupId ? account.accountGroupId.toString() : '',
			parentId: account.parentId ? account.parentId.toString() : '',
			level: account.level.toString(),
			balanceType: account.balanceType || ''
		};
		showForm = true;
	}

	// Close the form
	function closeForm() {
		showForm = false;
		if (formElement) formElement.reset();
	}

	// Handle form submission
	function handleSubmit() {
		return async ({ result }) => {
			if (result.type === 'success') {
				closeForm();
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Handle toggling account status
	function handleToggleStatus() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Handle delete account
	function handleDelete() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Format account code
	function formatCode(code) {
		return code.replace(/(\d{2})(?=\d)/g, '$1.');
	}

	// Get the color for account type
	function getAccountTypeColor(typeCode: string) {
		const colors = {
			ASSET: 'bg-blue-100 text-blue-800',
			LIABILITY: 'bg-red-100 text-red-800',
			EQUITY: 'bg-purple-100 text-purple-800',
			REVENUE: 'bg-green-100 text-green-800',
			EXPENSE: 'bg-orange-100 text-orange-800'
		};
		return colors[typeCode] || 'bg-gray-100 text-gray-800';
	}

	// Calculate level indentation
	function getIndentation(level: number) {
		return `pl-${2 + level * 4}`;
	}

	// Get parent account options, excluding self and children
	function getValidParentOptions(accounts, selfId = null) {
		if (!selfId) return accounts;

		// In edit mode, exclude self and all children
		const isChildOf = (account, potentialParentId) => {
			if (account.id.toString() === potentialParentId.toString()) return true;
			if (!account.parentId) return false;
			const parent = accounts.find((a) => a.id.toString() === account.parentId.toString());
			return parent ? isChildOf(parent, potentialParentId) : false;
		};

		return accounts.filter((account) => {
			return account.id.toString() !== selfId.toString() && !isChildOf(account, selfId);
		});
	}

	// Calculate the new level when parent changes
	function handleParentChange(event) {
		const parentId = event.target.value;
		if (!parentId) {
			formData.level = '1';
			return;
		}

		const parent = data.accounts.find((a) => a.id.toString() === parentId);
		if (parent) {
			formData.level = (parent.level + 1).toString();
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<div class="flex items-center gap-2">
				<a href="/gl/accounts" class="btn btn-ghost btn-sm px-2">
					<ArrowLeft class="h-4 w-4" />
				</a>
				<h1 class="text-2xl font-bold text-gray-900">Account List</h1>
			</div>
			<p class="text-sm text-gray-500">Manage all accounts in your chart of accounts</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-primary btn-sm gap-1" onclick={openCreateForm}>
				<Plus class="h-4 w-4" />
				Add Account
			</button>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-col gap-4 sm:flex-row">
		<div class="flex-1">
			<input
				type="text"
				placeholder="Search by code or name..."
				class="input input-bordered w-full"
				bind:value={searchTerm}
			/>
		</div>
		<div class="form-control">
			<label class="label cursor-pointer gap-2">
				<span class="label-text">Show inactive accounts</span>
				<input type="checkbox" class="toggle toggle-primary" bind:checked={showInactive} />
			</label>
		</div>
	</div>

	<!-- Accounts Table -->
	<div class="card bg-base-100 border">
		<div class="overflow-x-auto">
			<table class="table">
				<thead class="bg-base-200">
					<tr>
						<th class="w-1/6">Code</th>
						<th class="w-1/3">Account Name</th>
						<th>Type</th>
						<th>Group</th>
						<th>Status</th>
						<th class="w-32 text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if searchTerm}
						{#each filteredAccounts as account}
							<tr class="hover">
								<td class="font-mono">
									{formatCode(account.code)}
								</td>
								<td>
									<div class="font-medium">{account.name}</div>
									{#if account.description}
										<div class="text-xs text-gray-500">{account.description}</div>
									{/if}
								</td>
								<td>
									<div class={`badge ${getAccountTypeColor(account.accountType.code)}`}>
										{account.accountType.name}
									</div>
								</td>
								<td>
									{#if account.accountGroup}
										<div class="badge badge-outline">
											{account.accountGroup.name}
										</div>
									{:else}
										<div class="text-xs text-gray-500">-</div>
									{/if}
								</td>
								<td>
									{#if account.isActive}
										<div class="badge badge-success badge-sm">Active</div>
									{:else}
										<div class="badge badge-ghost badge-sm">Inactive</div>
									{/if}
								</td>
								<td>
									<div class="flex justify-center gap-1">
										<button
											class="btn btn-ghost btn-sm text-primary"
											onclick={() => openEditForm(account)}
										>
											<Edit class="h-4 w-4" />
										</button>
										<form method="POST" action="?/toggleStatus" use:enhance={handleToggleStatus}>
											<input type="hidden" name="id" value={account.id} />
											<input type="hidden" name="isActive" value={account.isActive} />
											<button type="submit" class="btn btn-ghost btn-sm">
												<ToggleLeft class="h-4 w-4" />
											</button>
										</form>
										<form method="POST" action="?/delete" use:enhance={handleDelete}>
											<input type="hidden" name="id" value={account.id} />
											<button
												type="submit"
												class="btn btn-ghost btn-sm text-error"
												onclick={(e) => {
													if (!confirm('Are you sure you want to delete this account?')) {
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
					{:else}
						{#each data.accountHierarchy as account}
							<tr class="hover">
								<td class="font-mono">
									<div class="flex items-center">
										<button
											class="btn btn-ghost btn-xs mr-2"
											onclick={() => toggleExpand(account.id)}
										>
											{#if expandedAccounts.has(account.id)}
												<ChevronDown class="h-4 w-4" />
											{:else}
												<ChevronRight class="h-4 w-4" />
											{/if}
										</button>
										{formatCode(account.code)}
									</div>
								</td>
								<td>
									<div class="font-medium">{account.name}</div>
									{#if account.description}
										<div class="text-xs text-gray-500">{account.description}</div>
									{/if}
								</td>
								<td>
									<div class={`badge ${getAccountTypeColor(account.accountType.code)}`}>
										{account.accountType.name}
									</div>
								</td>
								<td>
									{#if account.isActive}
										<div class="badge badge-success badge-sm">Active</div>
									{:else}
										<div class="badge badge-ghost badge-sm">Inactive</div>
									{/if}
								</td>
								<td>
									<div class="flex justify-center gap-1">
										<button
											class="btn btn-ghost btn-sm text-primary"
											onclick={() => openEditForm(account)}
										>
											<Edit class="h-4 w-4" />
										</button>
										<form method="POST" action="?/toggleStatus" use:enhance={handleToggleStatus}>
											<input type="hidden" name="id" value={account.id} />
											<input type="hidden" name="isActive" value={account.isActive} />
											<button type="submit" class="btn btn-ghost btn-sm">
												<ToggleLeft class="h-4 w-4" />
											</button>
										</form>
										<form method="POST" action="?/delete" use:enhance={handleDelete}>
											<input type="hidden" name="id" value={account.id} />
											<button
												type="submit"
												class="btn btn-ghost btn-sm text-error"
												onclick={(e) => {
													if (!confirm('Are you sure you want to delete this account?')) {
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

							{#if expandedAccounts.has(account.id) && account.children.length > 0}
								{#each account.children as childAccount}
									<tr class="hover bg-base-200/30">
										<td class="pl-10 font-mono">
											<div class="flex items-center">
												<button
													class="btn btn-ghost btn-xs mr-2"
													onclick={() => toggleExpand(childAccount.id)}
												>
													{#if expandedAccounts.has(childAccount.id)}
														<ChevronDown class="h-4 w-4" />
													{:else}
														<ChevronRight class="h-4 w-4" />
													{/if}
												</button>
												{formatCode(childAccount.code)}
											</div>
										</td>
										<td>
											<div class="font-medium">{childAccount.name}</div>
											{#if childAccount.description}
												<div class="text-xs text-gray-500">{childAccount.description}</div>
											{/if}
										</td>
										<td>
											<div class={`badge ${getAccountTypeColor(childAccount.accountType.code)}`}>
												{childAccount.accountType.name}
											</div>
										</td>
										<td>
											{#if childAccount.accountGroup}
												<div class="badge badge-outline">
													{childAccount.accountGroup.name}
												</div>
											{:else}
												<div class="text-xs text-gray-500">-</div>
											{/if}
										</td>
										<td>
											{#if childAccount.isActive}
												<div class="badge badge-success badge-sm">Active</div>
											{:else}
												<div class="badge badge-ghost badge-sm">Inactive</div>
											{/if}
										</td>
										<td>
											<div class="flex justify-center gap-1">
												<button
													class="btn btn-ghost btn-sm text-primary"
													onclick={() => openEditForm(childAccount)}
												>
													<Edit class="h-4 w-4" />
												</button>
												<form
													method="POST"
													action="?/toggleStatus"
													use:enhance={handleToggleStatus}
												>
													<input type="hidden" name="id" value={childAccount.id} />
													<input type="hidden" name="isActive" value={childAccount.isActive} />
													<button type="submit" class="btn btn-ghost btn-sm">
														<ToggleLeft class="h-4 w-4" />
													</button>
												</form>
												<form method="POST" action="?/delete" use:enhance={handleDelete}>
													<input type="hidden" name="id" value={childAccount.id} />
													<button
														type="submit"
														class="btn btn-ghost btn-sm text-error"
														onclick={(e) => {
															if (!confirm('Are you sure you want to delete this account?')) {
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

									{#if expandedAccounts.has(childAccount.id) && childAccount.children.length > 0}
										{#each childAccount.children as grandChildAccount}
											<tr class="hover bg-base-200/10">
												<td class="pl-16 font-mono">
													{formatCode(grandChildAccount.code)}
												</td>
												<td>
													<div class="font-medium">{grandChildAccount.name}</div>
													{#if grandChildAccount.description}
														<div class="text-xs text-gray-500">
															{grandChildAccount.description}
														</div>
													{/if}
												</td>
												<td>
													<div
														class={`badge ${getAccountTypeColor(
															grandChildAccount.accountType.code
														)}`}
													>
														{grandChildAccount.accountType.name}
													</div>
												</td>
												<td>
													{#if grandChildAccount.accountGroup}
														<div class="badge badge-outline">
															{grandChildAccount.accountGroup.name}
														</div>
													{:else}
														<div class="text-xs text-gray-500">-</div>
													{/if}
												</td>
												<td>
													{#if grandChildAccount.isActive}
														<div class="badge badge-success badge-sm">Active</div>
													{:else}
														<div class="badge badge-ghost badge-sm">Inactive</div>
													{/if}
												</td>
												<td>
													<div class="flex justify-center gap-1">
														<button
															class="btn btn-ghost btn-sm text-primary"
															onclick={() => openEditForm(grandChildAccount)}
														>
															<Edit class="h-4 w-4" />
														</button>
														<form
															method="POST"
															action="?/toggleStatus"
															use:enhance={handleToggleStatus}
														>
															<input type="hidden" name="id" value={grandChildAccount.id} />
															<input
																type="hidden"
																name="isActive"
																value={grandChildAccount.isActive}
															/>
															<button type="submit" class="btn btn-ghost btn-sm">
																<ToggleLeft class="h-4 w-4" />
															</button>
														</form>
														<form method="POST" action="?/delete" use:enhance={handleDelete}>
															<input type="hidden" name="id" value={grandChildAccount.id} />
															<button
																type="submit"
																class="btn btn-ghost btn-sm text-error"
																onclick={(e) => {
																	if (!confirm('Are you sure you want to delete this account?')) {
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
									{/if}
								{/each}
							{/if}
						{/each}
					{/if}

					{#if (searchTerm ? filteredAccounts : data.accounts).length === 0}
						<tr>
							<td colspan="6" class="py-8 text-center text-gray-500">
								{searchTerm
									? 'No accounts match your search criteria'
									: 'No accounts found. Create your first account.'}
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
				<div class="font-bold">Chart of Accounts Structure</div>
				<div class="text-xs">
					Your chart of accounts is organized hierarchically, with account types, account groups, and individual accounts.
					Each account has a unique code, belongs to an account type, and can be assigned to a functional group like 
					"Retained Earnings" or "Current Earnings". Account groups determine how accounts appear in financial reports.
				</div>
			</div>
		</div>
</div>

<!-- Account Form Modal -->
{#if showForm}
	<div class="modal modal-open">
		<div class="modal-box w-11/12 max-w-3xl">
			<h3 class="text-lg font-bold">
				{isEditing ? 'Edit Account' : 'Create New Account'}
			</h3>
			<form
				bind:this={formElement}
				method="POST"
				action={isEditing ? '?/update' : '?/create'}
				use:enhance={handleSubmit}
				class="mt-4"
			>
				{#if isEditing}
					<input type="hidden" name="id" value={formData.id} />
				{/if}

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="form-control w-full">
						<label class="label" for="code">
							<span class="label-text">Account Code</span>
						</label>
						<input
							id="code"
							name="code"
							type="text"
							class="input input-bordered w-full"
							placeholder="e.g. 1000"
							required
							maxlength="20"
							bind:value={formData.code}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="name">
							<span class="label-text">Account Name</span>
						</label>
						<input
							id="name"
							name="name"
							type="text"
							class="input input-bordered w-full"
							placeholder="e.g. Cash"
							required
							maxlength="255"
							bind:value={formData.name}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="accountTypeId">
							<span class="label-text">Account Type</span>
						</label>
						<select
							id="accountTypeId"
							name="accountTypeId"
							class="select select-bordered w-full"
							required
							bind:value={formData.accountTypeId}
						>
							<option value="">Select Account Type</option>
							{#each data.accountTypes as type}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="accountGroupId">
							<span class="label-text">Account Group</span>
						</label>
						<select
							id="accountGroupId"
							name="accountGroupId"
							class="select select-bordered w-full"
							bind:value={formData.accountGroupId}
						>
							<option value="">No Group</option>
							{#each data.accountGroups.filter(g => !formData.accountTypeId || g.accountTypeId.toString() === formData.accountTypeId) as group}
								<option value={group.id}>
									{group.code} - {group.name} ({group.balanceType})
								</option>
							{/each}
						</select>
						<label class="label">
							<span class="label-text-alt">Functional grouping for financial reports</span>
						</label>
					</div>

					<div class="form-control w-full">
						<label class="label" for="parentId">
							<span class="label-text">Parent Account</span>
						</label>
						<select
							id="parentId"
							name="parentId"
							class="select select-bordered w-full"
							bind:value={formData.parentId}
							onchange={handleParentChange}
						>
							<option value="">No Parent (Level 1)</option>
							{#each getValidParentOptions(data.accounts, isEditing ? formData.id : null) as account}
								<option value={account.id}>
									{formatCode(account.code)} - {account.name}
								</option>
							{/each}
						</select>
					</div>

					<input type="hidden" name="level" bind:value={formData.level} />
					
					<div class="form-control w-full">
						<label class="label" for="balanceType">
							<span class="label-text">Balance Type Override (Optional)</span>
						</label>
						<select
							id="balanceType"
							name="balanceType"
							class="select select-bordered w-full"
							bind:value={formData.balanceType}
						>
							<option value="">Use Group/Type Default</option>
							<option value="DEBIT">DEBIT</option>
							<option value="CREDIT">CREDIT</option>
						</select>
						<label class="label">
							<span class="label-text-alt">For contra accounts (e.g., Accumulated Depreciation)</span>
						</label>
					</div>

					<div class="form-control col-span-1 md:col-span-2">
						<label class="label" for="description">
							<span class="label-text">Description</span>
						</label>
						<textarea
							id="description"
							name="description"
							class="textarea textarea-bordered w-full"
							rows="3"
							placeholder="Optional description"
							bind:value={formData.description}
						></textarea>
					</div>
				</div>

				<div class="modal-action mt-6">
					<button type="submit" class="btn btn-primary">
						{isEditing ? 'Update Account' : 'Create Account'}
					</button>
					<button type="button" class="btn" onclick={closeForm}>Cancel</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
			onclick={closeForm}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && closeForm()}
		></div>
	</div>
{/if}
