<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		ArrowLeft,
		Plus,
		Filter,
		Edit,
		Trash2,
		AlertTriangle,
		ChevronRight,
		ChevronDown,
		Save,
		RefreshCw
	} from '@lucide/svelte';

	import SearchAbleSelect from '$lib/components/SearchAbleSelect.svelte';
	import { onMount } from 'svelte';

	import Pagination from '$lib/components/Pagination.svelte';

	let { data } = $props();

	function handlePageChange(page: number) {
		const searchParams = new URLSearchParams(window.location.search);
		searchParams.set('page', page.toString());
		goto(`?${searchParams.toString()}`);
	}
	console.log(data);
	let showFilters = $state(false);
	let showCreateForm = $state(false);
	let showEditForm = $state(false);
	let expandedEntries = $state(new Set<number>());
	let editingEntry = $state(null);
	let isGeneratingNumber = $state(false);

	// Form state
	let formData = $state({
		number: data.nextJournalNumber,
		date: new Date().toISOString().split('T')[0],
		description: '',
		reference: '',
		fiscalPeriodId: data.currentFiscalPeriod?.id.toString() || '',
		isbhp: false,
		jumlahKomitmenBagiHasil: '',
		lines: [
			{ accountId: '', description: '', debitAmount: '', creditAmount: '' },
			{ accountId: '', description: '', debitAmount: '', creditAmount: '' }
		]
	});

	// Filter state
	let startDate = $state(data.filters.startDate);
	let endDate = $state(data.filters.endDate);
	let status = $state(data.filters.status);
	let searchTerm = $state(data.filters.searchTerm);
	let fiscalPeriodId = $state(data.filters.fiscalPeriodId);

	// Calculated values
	let totalDebit = $derived(
		formData.isbhp
			? (parseFloat(formData.jumlahKomitmenBagiHasil) || 0).toFixed(2)
			: formData.lines
					.reduce((sum, line) => sum + (parseFloat(line.debitAmount) || 0), 0)
					.toFixed(2)
	);

	let totalCredit = $derived(
		formData.isbhp
			? (parseFloat(formData.jumlahKomitmenBagiHasil) || 0).toFixed(2)
			: formData.lines
					.reduce((sum, line) => sum + (parseFloat(line.creditAmount) || 0), 0)
					.toFixed(2)
	);

	let isBalanced = $derived(Math.abs(parseFloat(totalDebit) - parseFloat(totalCredit)) < 1);

	// Function to generate journal number based on selected date
	async function generateJournalNumber() {
		if (!formData.date) return;

		isGeneratingNumber = true;
		try {
			const formDataToSend = new FormData();
			formDataToSend.append('date', formData.date);

			const response = await fetch('?/generateJournalNumber', {
				method: 'POST',
				body: formDataToSend
			});

			const result = await response.json();

			console.log(result.data[0]);
			if (result.type === 'success') {
				const dataArray = JSON.parse(result.data);
				formData.number = dataArray[2];
			}
		} catch (error) {
			console.error('Error generating journal number:', error);
		} finally {
			isGeneratingNumber = false;
		}
	}

	// Watch for date changes and auto-generate journal number
	$effect(() => {
		if (formData.date && showCreateForm) {
			generateJournalNumber();
		}
	});

	// Watch for isbhp changes to reset form
	$effect(() => {
		if (formData.isbhp) {
			// Reset journal lines when BHP is checked
			formData.lines = [
				{ accountId: '', description: '', debitAmount: '', creditAmount: '' },
				{ accountId: '', description: '', debitAmount: '', creditAmount: '' }
			];
		} else {
			// Reset BHP amount when unchecked
			formData.jumlahKomitmenBagiHasil = '';
		}
	});

	// Format date for display
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	// Format amount as currency
	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(parseFloat(amount) || 0);
	}

	// Get color for status badge
	function getStatusColor(status) {
		switch (status) {
			case 'POSTED':
				return 'badge-success';
			default:
				return 'badge-ghost';
		}
	}

	// Add a new journal line
	function addJournalLine() {
		formData.lines = [
			...formData.lines,
			{ accountId: '', description: '', debitAmount: '', creditAmount: '' }
		];
	}

	// Remove a journal line
	function removeJournalLine(index) {
		formData.lines = formData.lines.filter((_, i) => i !== index);
	}

	// Handle account selection
	// function handleAccountSelect(index, accountId) {
	// 	formData.lines[index].accountId = accountId;
	// }

	// Handle amount input (ensures only one of debit/credit has a value)
	function handleAmountInput(event: Event, index: number, field: 'debitAmount' | 'creditAmount') {
		const inputElement = event.target as HTMLInputElement;
		const sanitizedValue = inputElement.value.replace(/[^0-9]/g, '');

		formData.lines[index][field] = sanitizedValue;

		if (sanitizedValue !== '') {
			if (field === 'debitAmount') {
				formData.lines[index].creditAmount = '';
			} else if (field === 'creditAmount') {
				formData.lines[index].debitAmount = '';
			}
		}
	}

	// Handle BHP amount input
	function handleBHPAmountInput(event: Event) {
		const inputElement = event.target as HTMLInputElement;
		const sanitizedValue = inputElement.value.replace(/[^0-9]/g, '');
		formData.jumlahKomitmenBagiHasil = sanitizedValue;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (
			[
				'Backspace',
				'Delete',
				'Tab',
				'Escape',
				'Enter',
				'ArrowLeft',
				'ArrowRight',
				'ArrowUp',
				'ArrowDown',
				'Home',
				'End'
			].includes(event.key)
		) {
			return;
		}

		if (
			(event.ctrlKey || event.metaKey) &&
			['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())
		) {
			return;
		}

		if (!/^[0-9]$/.test(event.key)) {
			event.preventDefault();
		}
	}

	// Toggle expand/collapse entry details
	function toggleExpand(entryId) {
		if (expandedEntries.has(entryId)) {
			expandedEntries.delete(entryId);
		} else {
			expandedEntries.add(entryId);
		}
		expandedEntries = new Set(expandedEntries);
	}

	// Open create form
	function openCreateForm() {
		formData = {
			number: data.nextJournalNumber,
			date: new Date().toISOString().split('T')[0],
			description: '',
			reference: '',
			fiscalPeriodId: data.currentFiscalPeriod?.id.toString() || '',
			isbhp: false,
			jumlahKomitmenBagiHasil: '',
			lines: [
				{ accountId: '', description: '', debitAmount: '', creditAmount: '' },
				{ accountId: '', description: '', debitAmount: '', creditAmount: '' }
			]
		};
		showCreateForm = true;
	}

	// Close create form
	function closeCreateForm() {
		showCreateForm = false;
	}

	// Open edit form
	function openEditForm(entry) {
		editingEntry = entry.id;

		// Prepare form data with existing entry values
		formData = {
			id: entry.id.toString(),
			number: entry.number,
			date: new Date(entry.date).toISOString().split('T')[0],
			description: entry.description || '',
			reference: entry.reference || '',
			fiscalPeriodId: entry.fiscalPeriodId,
			isbhp: entry.isbhp || false,
			jumlahKomitmenBagiHasil: entry.jumlahKomitmenBagiHasil || '',
			lines: entry.lines.map((line) => ({
				accountId: line.accountId, // Ensure string conversion
				description: line.description || '',
				debitAmount:
					parseFloat(line.debitAmount || 0) > 0 ? parseFloat(line.debitAmount).toString() : '',
				creditAmount:
					parseFloat(line.creditAmount || 0) > 0 ? parseFloat(line.creditAmount).toString() : ''
			}))
		};

		// Ensure we have at least 2 lines
		if (formData.lines.length < 2) {
			formData.lines.push({ accountId: '', description: '', debitAmount: '', creditAmount: '' });
		}

		showEditForm = true;
	}

	// Close edit form
	function closeEditForm() {
		showEditForm = false;
		editingEntry = null;
	}

	// Apply filters
	function applyFilters() {
		const searchParams = new URLSearchParams();

		if (startDate) searchParams.set('startDate', startDate);
		if (endDate) searchParams.set('endDate', endDate);
		if (status) searchParams.set('status', status);
		if (searchTerm) searchParams.set('search', searchTerm);
		if (fiscalPeriodId) searchParams.set('fiscalPeriodId', fiscalPeriodId);

		goto(`?${searchParams.toString()}`);
	}

	// Reset filters
	function resetFilters() {
		startDate = '';
		endDate = '';
		status = '';
		searchTerm = '';
		fiscalPeriodId = '';

		goto('/gl/ledger/journals');
	}

	// Handle form submission
	function handleSubmit() {
		return async ({ result }) => {
			if (result.type === 'success') {
				if (showCreateForm) {
					closeCreateForm();
				} else if (showEditForm) {
					closeEditForm();
				}
				goto(page.url.pathname, { invalidateAll: true });
			} else if (result.type === 'failure') {
				console.error('Form submission failed:', result.data);
				const errorMessage = result.data?.error || 'Unknown error';
				alert('Failed to save: ' + errorMessage);
			}
		};
	}

	// Handle post/reverse/delete actions
	function handleAction() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Find account by ID
	function findAccount(accountId) {
		return data.accounts.find((account) => account.id.toString() === accountId.toString());
	}

	// Get account code and name for display
	// function getAccountDisplay(accountId) {
	// 	const account = findAccount(accountId);
	// 	if (!account) return '';
	// 	return `${account.code} - ${account.name}`;
	// }

	onMount(() => {
		console.log(30000000 / 1.11);
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<div class="flex items-center gap-2">
				<a href="/gl/ledger" class="btn btn-ghost btn-sm px-2">
					<ArrowLeft class="h-4 w-4" />
				</a>
				<h1 class="text-2xl font-bold text-gray-900">Journal Entries</h1>
			</div>
			<p class="text-sm text-gray-500">Manage and record financial transactions</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-outline btn-sm gap-1" onclick={() => (showFilters = !showFilters)}>
				<Filter class="h-4 w-4" />
				{showFilters ? 'Hide Filters' : 'Show Filters'}
			</button>
			<button
				class="btn btn-primary btn-sm gap-1"
				onclick={openCreateForm}
				disabled={!data.currentFiscalPeriod}
			>
				<Plus class="h-4 w-4" />
				New Journal Entry
			</button>
		</div>
	</div>

	<!-- Filters -->
	{#if showFilters}
		<div class="card bg-base-100 border">
			<div class="card-body p-4">
				<h3 class="card-title text-lg">Filter Journal Entries</h3>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
					<div class="form-control w-full">
						<label class="label" for="startDate">
							<span class="label-text">Start Date</span>
						</label>
						<input
							type="date"
							id="startDate"
							class="input input-bordered w-full"
							bind:value={startDate}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="endDate">
							<span class="label-text">End Date</span>
						</label>
						<input
							type="date"
							id="endDate"
							class="input input-bordered w-full"
							bind:value={endDate}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="status">
							<span class="label-text">Status</span>
						</label>
						<select id="status" class="select select-bordered w-full" bind:value={status}>
							<option value="">All Statuses</option>
							<option value="POSTED">Posted</option>
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="fiscalPeriodId">
							<span class="label-text">Fiscal Period</span>
						</label>
						<select
							id="fiscalPeriodId"
							class="select select-bordered w-full"
							bind:value={fiscalPeriodId}
						>
							<option value="">All Periods</option>
							{#each data.fiscalPeriods as period}
								<option value={period.id}>{period.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="searchTerm">
							<span class="label-text">Search</span>
						</label>
						<input
							type="text"
							id="searchTerm"
							class="input input-bordered w-full"
							placeholder="Number or description..."
							bind:value={searchTerm}
						/>
					</div>
				</div>

				<div class="mt-4 flex justify-end gap-2">
					<button class="btn btn-outline btn-sm" onclick={resetFilters}>Reset</button>
					<button class="btn btn-primary btn-sm" onclick={applyFilters}>Apply Filters</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Warning if no fiscal period -->
	{#if !data.currentFiscalPeriod}
		<div class="alert alert-warning">
			<AlertTriangle class="h-5 w-5" />
			<span
				>No active fiscal period. You need to create and activate a fiscal period before creating
				journal entries.</span
			>
			<a href="/gl/ledger/periods" class="btn btn-sm">Manage Periods</a>
		</div>
	{/if}

	<!-- Journal Entries List -->
	<div class="card bg-base-100 border">
		<div class="overflow-x-auto">
			<table class="table">
				<thead class="bg-base-200">
					<tr>
						<th>Entry</th>
						<th>Date</th>
						<th>Description</th>
						<th>Reference</th>
						<th>Amount</th>
						<th>Status</th>
						<th class="w-32 text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry}
						<tr class="hover">
							<td>
								<button class="btn btn-ghost btn-xs mr-2" onclick={() => toggleExpand(entry.id)}>
									{#if expandedEntries.has(entry.id)}
										<ChevronDown class="h-4 w-4" />
									{:else}
										<ChevronRight class="h-4 w-4" />
									{/if}
									{entry.number}
								</button>
							</td>
							<td>{formatDate(entry.date)}</td>
							<td>
								<div class="font-medium">{entry.description}</div>
							</td>
							<td>
								{#if entry.reference}
									<div class=" text-gray-500">Ref: {entry.reference}</div>
								{:else}
									<div class=" text-gray-500">No Ref</div>
								{/if}
							</td>
							<td class="font-medium tabular-nums">{formatCurrency(entry.totalDebit)}</td>
							<td>
								<div class={`badge ${getStatusColor(entry.status)}`}>
									{entry.status}
								</div>
							</td>
							<td>
								<div class="flex justify-center gap-1">
									<button
										class="btn btn-ghost btn-sm"
										title="Edit Journal Entry"
										onclick={() => openEditForm(entry)}
									>
										<Edit class="h-4 w-4" />
									</button>
									<form method="POST" action="?/delete" use:enhance={handleAction}>
										<input type="hidden" name="id" value={entry.id} />
										<button
											type="submit"
											class="btn btn-ghost btn-sm text-error"
											title="Delete Journal Entry"
											onclick={(e) => {
												if (!confirm('Are you sure you want to delete this journal entry?')) {
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

						<!-- Expanded Entry Details -->
						{#if expandedEntries.has(entry.id)}
							<tr class="bg-base-200/20">
								<td colspan="7" class="p-0">
									<div class="p-4">
										<h4 class="mb-2 font-medium">Journal Lines</h4>
										<div class="overflow-x-auto">
											<table class="table-sm table">
												<thead class="text-xs">
													<tr>
														<th class="w-10">Line</th>
														<th>Account</th>
														<th>Description</th>
														<th class="text-right">Debit</th>
														<th class="text-right">Credit</th>
													</tr>
												</thead>
												<tbody>
													{#each entry.lines as line, i}
														<tr>
															<td>{i + 1}</td>
															<td class="font-mono text-xs">
																{line.account.code} - {line.account.name}
															</td>
															<td>{line.description || '-'}</td>
															<td class="text-right tabular-nums">
																{line.debitAmount > 0 ? formatCurrency(line.debitAmount) : ''}
															</td>
															<td class="text-right tabular-nums">
																{line.creditAmount > 0 ? formatCurrency(line.creditAmount) : ''}
															</td>
														</tr>
													{/each}
													<tr class="font-medium">
														<td colspan="3" class="text-right">Total</td>
														<td class="text-right tabular-nums">
															{formatCurrency(entry.totalDebit)}
														</td>
														<td class="text-right tabular-nums">
															{formatCurrency(entry.totalCredit)}
														</td>
													</tr>
												</tbody>
											</table>
										</div>

										<div class="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
											<div>
												<div class="font-medium">Created By</div>
												<div>{entry.createdByUser?.name || 'System'}</div>
											</div>
											{#if entry.postedByUser}
												<div>
													<div class="font-medium">Posted By</div>
													<div>{entry.postedByUser.name}</div>
												</div>
												<div>
													<div class="font-medium">Posted At</div>
													<div>{entry.postedAt ? formatDate(entry.postedAt) : '-'}</div>
												</div>
											{/if}
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{/each}

					{#if data.entries.length === 0}
						<tr>
							<td colspan="7" class="py-8 text-center text-gray-500">
								{data.filters.startDate ||
								data.filters.endDate ||
								data.filters.status ||
								data.filters.searchTerm ||
								data.filters.fiscalPeriodId
									? 'No journal entries match your filter criteria'
									: 'No journal entries found. Create your first entry.'}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
		<div class="card-actions justify-center p-4">
			<Pagination
				currentPage={data.pagination.currentPage}
				totalPages={data.pagination.totalPages}
				onPageChange={handlePageChange}
			/>
		</div>
	</div>
</div>

<!-- Create Journal Entry Modal -->
{#if showCreateForm}
	<div class="modal modal-open">
		<div class="modal-box w-11/12 max-w-5xl">
			<h3 class="text-lg font-bold">Create New Journal Entry</h3>

			<form method="POST" action="?/create" use:enhance={handleSubmit} class="mt-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="form-control w-full">
						<label class="label" for="number">
							<span class="label-text">Entry Number</span>
						</label>
						<div class="flex gap-2">
							<input
								type="text"
								id="number"
								name="number"
								class="input input-bordered w-full"
								bind:value={formData.number}
								required
								readonly
							/>
							<button
								type="button"
								class="btn btn-outline btn-sm"
								onclick={generateJournalNumber}
								disabled={isGeneratingNumber || !formData.date}
								title="Regenerate journal number based on selected date"
							>
								{#if isGeneratingNumber}
									<RefreshCw class="h-4 w-4 animate-spin" />
								{:else}
									<RefreshCw class="h-4 w-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="form-control w-full">
						<label class="label" for="date">
							<span class="label-text">Date</span>
						</label>
						<input
							type="date"
							id="date"
							name="date"
							class="input input-bordered w-full"
							bind:value={formData.date}
							required
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="description">
							<span class="label-text">Description</span>
						</label>
						<input
							type="text"
							id="description"
							name="description"
							class="input input-bordered w-full"
							placeholder="Journal entry description"
							bind:value={formData.description}
							required
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="reference">
							<span class="label-text">Reference (Optional)</span>
						</label>
						<input
							type="text"
							id="reference"
							name="reference"
							class="input input-bordered w-full"
							placeholder="Invoice number, etc."
							bind:value={formData.reference}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="fiscalPeriodId">
							<span class="label-text">Fiscal Period</span>
						</label>
						<select
							id="fiscalPeriodId"
							name="fiscalPeriodId"
							class="select select-bordered w-full"
							bind:value={formData.fiscalPeriodId}
							required
						>
							<option value="">Select Fiscal Period</option>
							{#each data.fiscalPeriods.filter((p) => !p.isClosed) as period}
								<option value={period.id}>{period.name}</option>
							{/each}
						</select>
					</div>

					<!-- BHP Checkbox -->
					<div class="form-control w-full">
						<label class="label cursor-pointer" for="isbhp">
							<span class="label-text">Bagi Hasil Partner (BHP)</span>
							<input
								type="checkbox"
								id="isbhp"
								name="isbhp"
								class="checkbox checkbox-primary"
								bind:checked={formData.isbhp}
							/>
						</label>
					</div>
				</div>

				<!-- Journal Lines or BHP Amount -->
				<div class="mt-6">
					{#if formData.isbhp}
						<!-- BHP Mode: Single Amount Input -->
						<div class="mb-2">
							<h4 class="font-medium">Jumlah Komitmen Bagi Hasil</h4>
						</div>

						<div class="form-control w-full max-w-md">
							<label class="label" for="jumlahKomitmenBagiHasil">
								<span class="label-text">Jumlah (IDR)</span>
							</label>
							<input
								type="text"
								id="jumlahKomitmenBagiHasil"
								name="jumlahKomitmenBagiHasil"
								class="input input-bordered w-full text-right"
								placeholder="0"
								bind:value={formData.jumlahKomitmenBagiHasil}
								oninput={handleBHPAmountInput}
								onkeydown={handleKeyDown}
								required
							/>
						</div>
					{:else}
						<!-- Normal Mode: Journal Lines -->
						<div class="mb-2 flex items-center justify-between">
							<h4 class="font-medium">Journal Lines</h4>
							<button type="button" class="btn btn-outline btn-sm" onclick={addJournalLine}>
								Add Line
							</button>
						</div>

						<div>
							<table class="table">
								<thead>
									<tr>
										<th class="w-10">#</th>
										<th>Account</th>
										<th>Description</th>
										<th class="w-32">Debit</th>
										<th class="w-32">Credit</th>
										<th class="w-10"></th>
									</tr>
								</thead>
								<tbody>
									{#each formData.lines as line, index}
										<tr>
											<td>{index + 1}</td>
											<td class="min-w-64">
												<SearchAbleSelect
													items={data.accounts}
													bind:value={line.accountId}
													placeholder="Search account code or name..."
													required={true}
												/>
											</td>
											<td>
												<input
													type="text"
													class="input input-bordered w-full"
													placeholder="Line description"
													bind:value={line.description}
												/>
											</td>
											<td>
												<input
													type="number"
													class="input input-bordered w-full text-right"
													placeholder="0.00"
													step="1"
													min="0"
													bind:value={line.debitAmount}
													oninput={(event) => handleAmountInput(event, index, 'debitAmount')}
													onkeydown={handleKeyDown}
												/>
											</td>
											<td>
												<input
													type="number"
													class="input input-bordered w-full text-right"
													placeholder="0.00"
													step="1"
													min="0"
													bind:value={line.creditAmount}
													oninput={(event) => handleAmountInput(event, index, 'creditAmount')}
													onkeydown={handleKeyDown}
												/>
											</td>
											<td>
												{#if formData.lines.length > 2}
													<button
														type="button"
														class="btn btn-ghost btn-sm text-error"
														onclick={() => removeJournalLine(index)}
													>
														<Trash2 class="h-4 w-4" />
													</button>
												{/if}
											</td>
										</tr>
									{/each}

									<!-- Totals Row -->
									<tr class="bg-base-200">
										<td colspan="3" class="text-right font-medium">Totals</td>
										<td class="text-right font-medium">{formatCurrency(totalDebit)}</td>
										<td class="text-right font-medium">{formatCurrency(totalCredit)}</td>
										<td></td>
									</tr>
								</tbody>
							</table>
						</div>

						<!-- Balance Warning -->
						{#if !isBalanced}
							<div class="alert alert-error mt-4">
								<AlertTriangle class="h-5 w-5" />
								<span
									>Debits and credits must be equal. Current difference: {formatCurrency(
										Math.abs(parseFloat(totalDebit) - parseFloat(totalCredit))
									)}</span
								>
							</div>
						{/if}
					{/if}

					<!-- Hidden inputs for journal lines -->
					{#if !formData.isbhp}
						<input type="hidden" name="lineCount" value={formData.lines.length} />
						{#each formData.lines as line, i}
							<input type="hidden" name={`lines[${i}].accountId`} value={line.accountId || ''} />
							<input
								type="hidden"
								name={`lines[${i}].description`}
								value={line.description || ''}
							/>
							<input type="hidden" name={`lines[${i}].debitAmount`} value={line.debitAmount || 0} />
							<input
								type="hidden"
								name={`lines[${i}].creditAmount`}
								value={line.creditAmount || 0}
							/>
						{/each}
					{/if}
				</div>

				<div class="modal-action mt-6">
					<button
						type="submit"
						class="btn btn-primary"
						disabled={formData.isbhp
							? !formData.jumlahKomitmenBagiHasil
							: !isBalanced || formData.lines.length < 2}
					>
						Create Journal Entry
					</button>
					<button type="button" class="btn" onclick={closeCreateForm}>Cancel</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={closeCreateForm}></div>
	</div>
{/if}

<!-- Edit Journal Entry Modal -->
{#if showEditForm}
	<div class="modal modal-open">
		<div class="modal-box w-11/12 max-w-5xl">
			<h3 class="text-lg font-bold">Edit Journal Entry</h3>

			<form method="POST" action="?/update" use:enhance={handleSubmit} class="mt-4">
				<input type="hidden" name="id" value={formData.id} />

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="form-control w-full">
						<label class="label" for="edit-number">
							<span class="label-text">Entry Number</span>
						</label>
						<input
							type="text"
							id="edit-number"
							name="number"
							class="input input-bordered w-full"
							value={formData.number}
							required
							readonly
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="edit-date">
							<span class="label-text">Date</span>
						</label>
						<input
							type="date"
							id="edit-date"
							name="date"
							class="input input-bordered w-full"
							bind:value={formData.date}
							required
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="edit-description">
							<span class="label-text">Description</span>
						</label>
						<input
							type="text"
							id="edit-description"
							name="description"
							class="input input-bordered w-full"
							placeholder="Journal entry description"
							bind:value={formData.description}
							required
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="edit-reference">
							<span class="label-text">Reference (Optional)</span>
						</label>
						<input
							type="text"
							id="edit-reference"
							name="reference"
							class="input input-bordered w-full"
							placeholder="Invoice number, etc."
							bind:value={formData.reference}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="edit-fiscalPeriodId">
							<span class="label-text">Fiscal Period</span>
						</label>
						<select
							id="edit-fiscalPeriodId"
							name="fiscalPeriodId"
							class="select select-bordered w-full"
							bind:value={formData.fiscalPeriodId}
							required
						>
							<option value="">Select Fiscal Period</option>
							{#each data.fiscalPeriods.filter((p) => !p.isClosed) as period}
								<option value={period.id}>{period.name}</option>
							{/each}
						</select>
					</div>

					<!-- BHP Checkbox for Edit -->
					<div class="form-control w-full">
						<label class="label cursor-pointer" for="edit-isbhp">
							<span class="label-text">Bagi Hasil Partner (BHP)</span>
							<input
								type="checkbox"
								id="edit-isbhp"
								name="isbhp"
								class="checkbox checkbox-primary"
								bind:checked={formData.isbhp}
							/>
						</label>
					</div>
				</div>

				<!-- Journal Lines or BHP Amount for Edit -->
				<div class="mt-6">
					{#if formData.isbhp}
						<!-- BHP Mode: Single Amount Input -->
						<div class="mb-2">
							<h4 class="font-medium">Jumlah Komitmen Bagi Hasil</h4>
						</div>

						<div class="form-control w-full max-w-md">
							<label class="label" for="edit-jumlahKomitmenBagiHasil">
								<span class="label-text">Jumlah (IDR)</span>
							</label>
							<input
								type="text"
								id="edit-jumlahKomitmenBagiHasil"
								name="jumlahKomitmenBagiHasil"
								class="input input-bordered w-full text-right"
								placeholder="0"
								bind:value={formData.jumlahKomitmenBagiHasil}
								oninput={handleBHPAmountInput}
								onkeydown={handleKeyDown}
								required
							/>
						</div>
					{:else}
						<!-- Normal Mode: Journal Lines -->
						<div class="mb-2 flex items-center justify-between">
							<h4 class="font-medium">Journal Lines</h4>
							<button type="button" class="btn btn-outline btn-sm" onclick={addJournalLine}>
								Add Line
							</button>
						</div>

						<div>
							<table class="table">
								<thead>
									<tr>
										<th class="w-10">#</th>
										<th>Account</th>
										<th>Description</th>
										<th class="w-32">Debit</th>
										<th class="w-32">Credit</th>
										<th class="w-10"></th>
									</tr>
								</thead>
								<tbody>
									{#each formData.lines as line, index}
										<tr>
											<td>{index + 1}</td>
											<td>
												<SearchAbleSelect
													items={data.accounts}
													bind:value={line.accountId}
													placeholder="Search account code or name..."
													required={true}
												/>
											</td>
											<td>
												<input
													type="text"
													class="input input-bordered w-full"
													placeholder="Line description"
													bind:value={line.description}
												/>
											</td>
											<td>
												<input
													type="text"
													inputmode="numeric"
													class="input input-bordered w-full text-right"
													placeholder="0"
													bind:value={line.debitAmount}
													oninput={(event) => handleAmountInput(event, index, 'debitAmount')}
													onkeydown={handleKeyDown}
												/>
											</td>
											<td>
												<input
													type="number"
													class="input input-bordered w-full text-right"
													placeholder="0.00"
													step="1"
													min="0"
													bind:value={line.creditAmount}
													oninput={(event) => handleAmountInput(event, index, 'creditAmount')}
													onkeydown={handleKeyDown}
												/>
											</td>
											<td>
												{#if formData.lines.length > 2}
													<button
														type="button"
														class="btn btn-ghost btn-sm text-error"
														onclick={() => removeJournalLine(index)}
													>
														<Trash2 class="h-4 w-4" />
													</button>
												{/if}
											</td>
										</tr>
									{/each}

									<!-- Totals Row -->
									<tr class="bg-base-200">
										<td colspan="3" class="text-right font-medium">Totals</td>
										<td class="text-right font-medium">{formatCurrency(totalDebit)}</td>
										<td class="text-right font-medium">{formatCurrency(totalCredit)}</td>
										<td></td>
									</tr>
								</tbody>
							</table>
						</div>

						<!-- Balance Warning -->
						{#if !isBalanced}
							<div class="alert alert-error mt-4">
								<AlertTriangle class="h-5 w-5" />
								<span>
									Debits and credits must be equal. Current difference: {formatCurrency(
										Math.abs(parseFloat(totalDebit) - parseFloat(totalCredit))
									)}
								</span>
							</div>
						{/if}
					{/if}

					<!-- Hidden inputs for journal lines -->
					{#if !formData.isbhp}
						<input type="hidden" name="lineCount" value={formData.lines.length} />
						{#each formData.lines as line, i}
							<input type="hidden" name={`lines[${i}].accountId`} value={line.accountId || ''} />
							<input
								type="hidden"
								name={`lines[${i}].description`}
								value={line.description || ''}
							/>
							<input type="hidden" name={`lines[${i}].debitAmount`} value={line.debitAmount || 0} />
							<input
								type="hidden"
								name={`lines[${i}].creditAmount`}
								value={line.creditAmount || 0}
							/>
						{/each}
					{/if}
				</div>

				<div class="modal-action mt-6">
					<button
						type="submit"
						class="btn btn-primary"
						disabled={formData.isbhp
							? !formData.jumlahKomitmenBagiHasil
							: !isBalanced || formData.lines.length < 2}
					>
						<Save class="mr-1 h-4 w-4" />
						Save Changes
					</button>
					<button type="button" class="btn" onclick={closeEditForm}>Cancel</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={closeEditForm}></div>
	</div>
{/if}
