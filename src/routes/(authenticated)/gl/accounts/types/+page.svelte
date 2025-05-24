<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FormType from '$lib/components/Types/FormType.svelte';
	import Types from '$lib/components/Types/Types.svelte';
	import { ArrowLeft, Plus, AlertTriangle } from '@lucide/svelte';

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
		data.accountTypes.filter(
			(type) =>
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
					<Types {filteredTypes} {openEditModal} {searchTerm} />
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
	<FormType {closeModal} {currentType} {handleSubmit} {isEditing} />
{/if}
