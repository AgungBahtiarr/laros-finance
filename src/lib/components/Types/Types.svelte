<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Edit, Trash2 } from '@lucide/svelte';
	const { filteredTypes, openEditModal, searchTerm } = $props();

	function handleDelete() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	function getBalanceColor(balance) {
		return balance === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
	}
</script>

{#each filteredTypes as type}
	<tr class="hover">
		<td class="font-mono font-medium">{type.code}</td>
		<td>{type.name}</td>
		<td>
			<div class={`badge ${getBalanceColor(type.balanceType)}`}>
				{type.balanceType}
			</div>
		</td>
		<td>
			<div class="flex justify-center gap-1">
				<button class="btn btn-ghost btn-sm text-primary" onclick={() => openEditModal(type)}>
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
			{searchTerm ? 'No account types match your search criteria' : 'No account types found'}
		</td>
	</tr>
{/if}
