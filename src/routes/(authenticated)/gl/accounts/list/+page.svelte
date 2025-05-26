<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FormList from '$lib/components/AccountList/FormList.svelte';
	import List from '$lib/components/AccountList/List.svelte';
	import { ArrowLeft, Plus, AlertTriangle } from '@lucide/svelte';

	let { data } = $props();
	let searchTerm = $state('');
	let showInactive = $state(true);
	let expandedAccounts = $state(new Set<number>());

	// Form for creating/editing account
	let showForm = $state(false);
	let isEditing = $state(false);
	let formData = $state({
		id: '',
		code: '',
		name: '',
		description: '',
		accountGroupId: '',
		parentId: '',
		level: '1',
		balanceType: '',
		isActive: true
	});

	// Reference to form element
	let formElement = $state(null);

	// Handle hierarchy expansion
	function toggleExpand(accountId: number) {
		if (expandedAccounts.has(accountId)) {
			expandedAccounts.delete(accountId);
		} else {
			expandedAccounts.add(accountId);
		}
		// Force reactivity
		expandedAccounts = new Set(expandedAccounts);
	}
	// Filtered accounts
	let filteredAccounts = $derived(
		// Filter the flat list of accounts
		data.accounts.filter((account) => {
			const matchSearch =
				account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				account.code.toLowerCase().includes(searchTerm.toLowerCase());
			const matchStatus = showInactive ? true : account.isActive;
			return matchSearch && matchStatus;
		})
	);

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
		formData = {
			id: '',
			code: '',
			name: '',
			description: '',
			accountGroupId: '',
			parentId: '',
			level: '1',
			balanceType: '',
			isActive: true
		};
		showForm = true;
		isEditing = false;
	}

	// Open form for editing an account
	// Open form for editing an existing account
	function openEditForm(account) {
		formData = {
			id: account.id.toString(),
			code: account.code,
			name: account.name,
			description: account.description || '',
			accountGroupId: account.accountGroupId ? account.accountGroupId.toString() : '',
			parentId: account.parentId ? account.parentId.toString() : '',
			level: account.level.toString(),
			balanceType: account.balanceType || '',
			isActive: account.isActive
		};
		showForm = true;
		isEditing = true;
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
				<h1 class="text-2xl font-bold text-gray-900">Daftar Account</h1>
			</div>
			<p class="text-sm text-gray-500">Kelola semua akun dalam chart of accounts</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-primary btn-sm gap-1" onclick={openCreateForm}>
				<Plus class="h-4 w-4" />
				Tambah Akun
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
				<span class="label-text">Tampilkan akun inaktif</span>
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
				<tbody
					><List
						{filteredAccounts}
						{data}
						{expandedAccounts}
						{openEditForm}
						{searchTerm}
						{showInactive}
						{toggleExpand}
					/>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Quick Help -->
	<div class="alert alert-info">
		<AlertTriangle class="h-5 w-5" />
		<div>
			<div class="font-bold">Struktur Chart of Accounts</div>
			<div class="text-xs">
				Chart of Account Anda disusun secara hierarkis, dengan jenis akun, grup akun, dan akun
				individual. Setiap akun memiliki kode unik, termasuk dalam jenis akun, dan dapat ditetapkan
				ke grup fungsional seperti "Aktiva Lancar" atau "Biaya Operasional". Grup akun menentukan
				bagaimana akun muncul dalam laporan keuangan.
			</div>
		</div>
	</div>
</div>

<!-- Account Form Modal -->
{#if showForm}
	<FormList
		{handleParentChange}
		{closeForm}
		{data}
		{formData}
		{formElement}
		{getValidParentOptions}
		{handleSubmit}
		{isEditing}
	/>
{/if}
