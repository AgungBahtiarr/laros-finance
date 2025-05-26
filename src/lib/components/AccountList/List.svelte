<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronDown, ChevronRight, Edit, ToggleLeft, Trash2 } from '@lucide/svelte';

	let {
		searchTerm,
		showInactive,
		openEditForm,
		expandedAccounts,
		toggleExpand,
		data,
		filteredAccounts
	} = $props();

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

	// Get the color for account type
	function getAccountTypeColor(typeCode: string) {
		const colors = {
			ASSET: 'bg-blue-100 text-blue-800',
			LIABILITY: 'bg-red-100 text-red-800',
			EQUITY: 'bg-purple-100 text-purple-800',
			RETAINED_EARNING: 'bg-green-100 text-green-800',
			'PROFIT&LOSS': 'bg-orange-100 text-orange-800'
		};
		return colors[typeCode] || 'bg-gray-100 text-gray-800';
	}
</script>

{#if searchTerm || showInactive}
	{#each filteredAccounts as account}
		<tr class="hover">
			<td class="font-mono">
				{account.code}
			</td>
			<td>
				<div class="font-medium">{account.name}</div>
				{#if account.description}
					<div class="text-xs text-gray-500">{account.description}</div>
				{/if}
			</td>
			<td>
				<div
					class={`badge ${getAccountTypeColor(account.accountGroup?.accountType?.code || 'ASSET')}`}
				>
					{account.accountGroup?.accountType?.name || 'Unknown'}
				</div>
			</td>
			<td>
				<div class="badge badge-outline">
					{account.accountGroup.name}
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
					<button class="btn btn-ghost btn-sm text-primary" onclick={() => openEditForm(account)}>
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
					{#if account.children && account.children.length > 0}
						<button class="btn btn-ghost btn-xs mr-2" onclick={() => toggleExpand(account.id)}>
							{#if expandedAccounts.has(account.id)}
								<ChevronDown class="h-4 w-4" />
							{:else}
								<ChevronRight class="h-4 w-4" />
							{/if}
						</button>
					{:else}
						<div class="w-8"></div>
					{/if}
					{account.code}
				</div>
			</td>
			<td>
				<div class="font-medium">{account.name}</div>
				{#if account.description}
					<div class="text-xs text-gray-500">{account.description}</div>
				{/if}
			</td>
			<td>
				<div
					class={`badge ${getAccountTypeColor(account.accountGroup?.accountType?.code || 'ASSET')}`}
				>
					{account.accountGroup?.accountType?.name || 'Unknown'}
				</div>
			</td>
			<td>
				<div class="badge badge-outline">
					{account.accountGroup.name}
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
					<button class="btn btn-ghost btn-sm text-primary" onclick={() => openEditForm(account)}>
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

		{#if expandedAccounts.has(account.id) && account.children && account.children.length > 0}
			{#each account.children as childAccount}
				<tr class="hover bg-base-200/30">
					<td class="pl-10 font-mono">
						<div class="flex items-center">
							{#if childAccount.children && childAccount.children.length > 0}
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
							{:else}
								<div class="w-8"></div>
							{/if}
							{childAccount.code}
						</div>
					</td>
					<td>
						<div class="font-medium">{childAccount.name}</div>
						{#if childAccount.description}
							<div class="text-xs text-gray-500">{childAccount.description}</div>
						{/if}
					</td>
					<td>
						<div
							class={`badge ${getAccountTypeColor(childAccount.accountGroup?.accountType?.code || 'ASSET')}`}
						>
							{childAccount.accountGroup?.accountType?.name || 'Unknown'}
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
							<form method="POST" action="?/toggleStatus" use:enhance={handleToggleStatus}>
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
										if (!confirm('Apakah anda yakin ingin menghapus akun ini?')) {
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

{#if (searchTerm ? filteredAccounts : data.accounts).length === 0}
	<tr>
		<td colspan="6" class="py-8 text-center text-gray-500">
			{searchTerm
				? 'Tidak ada akun yang cocok dengan kriteria pencarian Anda'
				: 'Tidak ada akun yang ditemukan. Buat akun pertama Anda.'}
		</td>
	</tr>
{/if}
