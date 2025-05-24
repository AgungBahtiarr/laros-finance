<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Edit, ToggleLeft, Trash2 } from '@lucide/svelte';
	const { filteredGroups, openEditModal } = $props();

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

	function getBalanceTypeColor(balanceType) {
		return balanceType === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
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
</script>

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
				<button class="btn btn-ghost btn-sm text-primary" onclick={() => openEditModal(group)}>
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
