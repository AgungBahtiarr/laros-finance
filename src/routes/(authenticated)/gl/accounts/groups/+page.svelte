<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft, Plus, AlertTriangle } from '@lucide/svelte';
	import FormGroup from '$lib/components/Groups/FormGroup.svelte';
	import Groups from '$lib/components/Groups/Groups.svelte';

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
						<th>Status</th>
						<th class="w-32 text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					<Groups {filteredGroups} {openEditModal} />
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
	<FormGroup
		accountTypes={data.accountTypes}
		{closeModal}
		{currentGroup}
		{handleSubmit}
		{isEditing}
	/>
{/if}
