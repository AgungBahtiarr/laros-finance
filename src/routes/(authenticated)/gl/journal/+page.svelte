<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Plus,
		Filter,
		Calendar,
		Search,
		ArrowUpRight,
		Check,
		RotateCcw,
		Trash2,
		Eye,
		ChevronDown,
		ChevronUp,
		Minus,
		AlertTriangle
	} from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let searchTerm = $state(data.filters.searchTerm || '');
	let status = $state(data.filters.status || '');
	let startDate = $state(data.filters.startDate || '');
	let endDate = $state(data.filters.endDate || '');
	let fiscalPeriodId = $state(data.filters.fiscalPeriodId || '');

	// Show filters toggle
	let showFilters = $state(false);

	// Journal Entry Form
	let showForm = $state(false);
	let journalForm = $state(null);
	let formError = $state('');
	let formNumberError = $state('');
	let formDateError = $state('');
	let formLinesError = $state('');

	// Journal entry data
	let journalNumber = $state(data.nextJournalNumber);
	let journalDate = $state(new Date().toISOString().split('T')[0]);
	let journalDescription = $state('');
	let journalReference = $state('');
	let journalFiscalPeriodId = $state(data.currentFiscalPeriod?.id || '');

	// Journal lines
	let journalLines = $state([
		{ accountId: '', description: '', debitAmount: '', creditAmount: '' },
		{ accountId: '', description: '', debitAmount: '', creditAmount: '' }
	]);

	// Journal entry details view
	let expandedEntry = $state(null);

	// Apply filters
	function applyFilters() {
		const searchParams = new URLSearchParams();

		if (searchTerm) searchParams.set('search', searchTerm);
		if (status) searchParams.set('status', status);
		if (startDate) searchParams.set('startDate', startDate);
		if (endDate) searchParams.set('endDate', endDate);
		if (fiscalPeriodId) searchParams.set('fiscalPeriodId', fiscalPeriodId);

		goto(`?${searchParams.toString()}`);
	}

	// Reset filters
	function resetFilters() {
		searchTerm = '';
		status = '';
		startDate = '';
		endDate = '';
		fiscalPeriodId = '';

		goto('/gl/journal');
	}

	// Open journal entry form
	function openJournalForm() {
		// Reset form
		journalNumber = data.nextJournalNumber;
		journalDate = new Date().toISOString().split('T')[0];
		journalDescription = '';
		journalReference = '';
		journalFiscalPeriodId = data.currentFiscalPeriod?.id || '';
		journalLines = [
			{ accountId: '', description: '', debitAmount: '', creditAmount: '' },
			{ accountId: '', description: '', debitAmount: '', creditAmount: '' }
		];

		formError = '';
		formNumberError = '';
		formDateError = '';
		formLinesError = '';

		showForm = true;
	}

	// Close journal form
	function closeJournalForm() {
		showForm = false;
	}

	// Add journal line
	function addJournalLine() {
		journalLines = [...journalLines, { accountId: '', description: '', debitAmount: '', creditAmount: '' }];
	}

	// Remove journal line
	function removeJournalLine(index) {
		if (journalLines.length <= 2) {
			formLinesError = 'A journal entry must have at least two lines';
			return;
		}

		journalLines = journalLines.filter((_, i) => i !== index);
		formLinesError = '';
	}

	// Toggle entry details
	function toggleEntryDetails(entryId) {
		if (expandedEntry === entryId) {
			expandedEntry = null;
		} else {
			expandedEntry = entryId;
		}
	}

	// Calculate totals
	function calculateTotals() {
		let totalDebit = 0;
		let totalCredit = 0;

		journalLines.forEach(line => {
			totalDebit += parseFloat(line.debitAmount) || 0;
			totalCredit += parseFloat(line.creditAmount) || 0;
		});

		return {
			totalDebit: totalDebit.toFixed(2),
			totalCredit: totalCredit.toFixed(2),
			isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
		};
	}

	// Format date
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}

	// Format currency
	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
	}

	// Handle form submission
	function handleSubmit() {
		// Validate form
		formError = '';
		formNumberError = '';
		formDateError = '';
		formLinesError = '';

		// Check number and date
		if (!journalNumber) {
			formNumberError = 'Journal number is required';
			return;
		}

		if (!journalDate) {
			formDateError = 'Journal date is required';
			return;
		}

		// Check lines
		const filledLines = journalLines.filter(line =>
			line.accountId && (parseFloat(line.debitAmount) > 0 || parseFloat(line.creditAmount) > 0)
		);

		if (filledLines.length < 2) {
			formLinesError = 'A journal entry must have at least two lines with accounts and amounts';
			return;
		}

		// Check balance
		const { isBalanced } = calculateTotals();
		if (!isBalanced) {
			formError = 'Journal entry is not balanced. Total debits must equal total credits.';
			return;
		}

		// Submit form
		return async ({ result }) => {
			if (result.type === 'success') {
				closeJournalForm();
				goto(`?${new URLSearchParams(page.url.searchParams).toString()}`, { invalidateAll: true });
			} else if (result.type === 'failure') {
				formError = result.data?.error || 'Failed to create journal entry';
			}
		};
	}

	// Handle post, reverse, or delete
	function handleEntryAction(action) {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(`?${new URLSearchParams(page.url.searchParams).toString()}`, { invalidateAll: true });
			}
		};
	}

	// Get badge color based on status
	function getStatusBadgeColor(status) {
		switch (status) {
			case 'DRAFT':
				return 'badge-warning';
			case 'POSTED':
				return 'badge-success';
			case 'REVERSED':
				return 'badge-error';
			default:
				return 'badge-ghost';
		}
	}

	// Check if an account is used in a particular side (debit/credit)
	function isAccountUsed(accountId, side, lineIndex) {
		return journalLines.some((line, index) =>
			index !== lineIndex &&
			line.accountId === accountId &&
			((side === 'debit' && line.debitAmount) ||
			 (side === 'credit' && line.creditAmount))
		);
	}

	// Auto calculate the balancing amount
	function autoBalance() {
		const { totalDebit, totalCredit } = calculateTotals();
		const diff = parseFloat(totalDebit) - parseFloat(totalCredit);

		if (diff === 0) return; // Already balanced

		// Find the last line with an account selected but no amount
		const lastEmptyLine = [...journalLines].reverse().find(line =>
			line.accountId && !line.debitAmount && !line.creditAmount
		);

		if (lastEmptyLine) {
			const index = journalLines.indexOf(lastEmptyLine);
			if (diff > 0) {
				// Need more credit
				journalLines[index].creditAmount = Math.abs(diff).toFixed(2);
				journalLines[index].debitAmount = '';
			} else {
				// Need more debit
				journalLines[index].debitAmount = Math.abs(diff).toFixed(2);
				journalLines[index].creditAmount = '';
			}
		}
	}

	// Get account options, filtered by type if needed
	function getAccountOptions() {
		return data.accounts;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Journal Entries</h1>
			<p class="text-sm text-gray-500">Create and manage accounting transactions</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-outline btn-sm gap-1" onclick={() => showFilters = !showFilters}>
				<Filter class="h-4 w-4" />
				{showFilters ? 'Hide Filters' : 'Show Filters'}
			</button>
			<button class="btn btn-primary btn-sm gap-1" onclick={openJournalForm}>
				<Plus class="h-4 w-4" />
				New Journal Entry
			</button>
		</div>
	</div>

	<!-- Filters -->
	{#if showFilters}
		<div class="card bg-base-100 border">
			<div class="card-body p-4">
				<h2 class="card-title text-lg">Filter Journal Entries</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
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

					<div class="form-control w-full">
						<label class="label" for="status">
							<span class="label-text">Status</span>
						</label>
						<select id="status" class="select select-bordered w-full" bind:value={status}>
							<option value="">All Statuses</option>
							<option value="DRAFT">Draft</option>
							<option value="POSTED">Posted</option>
							<option value="REVERSED">Reversed</option>
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="startDate">
							<span class="label-text">From Date</span>
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
							<span class="label-text">To Date</span>
						</label>
						<input
							type="date"
							id="endDate"
							class="input input-bordered w-full"
							bind:value={endDate}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="fiscalPeriodId">
							<span class="label-text">Fiscal Period</span>
						</label>
						<select id="fiscalPeriodId" class="select select-bordered w-full" bind:value={fiscalPeriodId}>
							<option value="">All Periods</option>
							{#each data.fiscalPeriods as period}
								<option value={period.id}>{period.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button class="btn btn-outline btn-sm gap-1" onclick={resetFilters}>
						<RotateCcw class="h-4 w-4" />
						Reset
					</button>
					<button class="btn btn-primary btn-sm" onclick={applyFilters}>Apply Filters</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Journal Entries Table -->
	<div class="card bg-base-100 border">
		<div class="overflow-x-auto">
			<table class="table">
				<thead class="bg-base-200">
					<tr>
						<th>Entry Number</th>
						<th>Date</th>
						<th>Description</th>
						<th>Status</th>
						<th class="text-right">Amount</th>
						<th class="w-32 text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry}
						<tr class="hover">
							<td>
								<button
									class="flex items-center gap-2 font-medium"
									onclick={() => toggleEntryDetails(entry.id)}
								>
									{#if expandedEntry === entry.id}
										<ChevronUp class="h-4 w-4 text-gray-500" />
									{:else}
										<ChevronDown class="h-4 w-4 text-gray-500" />
									{/if}
									{entry.number}
								</button>
							</td>
							<td>{formatDate(entry.date)}</td>
							<td class="max-w-xs truncate">{entry.description}</td>
							<td>
								<div class={`badge ${getStatusBadgeColor(entry.status)} badge-sm`}>
									{entry.status}
								</div>
							</td>
							<td class="text-right font-mono">{formatCurrency(entry.totalDebit)}</td>
							<td>
								<div class="flex justify-center gap-1">
									{#if entry.status === 'DRAFT'}
										<form
											method="POST"
											action="?/post"
											use:enhance={handleEntryAction('post')}
										>
											<input type="hidden" name="id" value={entry.id} />
											<button type="submit" class="btn btn-ghost btn-sm text-success" title="Post Entry">
												<Check class="h-4 w-4" />
											</button>
										</form>
										<form
											method="POST"
											action="?/delete"
											use:enhance={handleEntryAction('delete')}
										>
											<input type="hidden" name="id" value={entry.id} />
											<button type="submit" class="btn btn-ghost btn-sm text-error" title="Delete Entry">
<Trash2 class="h-4 w-4" />
											</button>
										</form>
									{:else if entry.status === 'POSTED'}
										<form
											method="POST"
											action="?/reverse"
											use:enhance={handleEntryAction('reverse')}
										>
											<input type="hidden" name="id" value={entry.id} />
											<button type="submit" class="btn btn-ghost btn-sm text-warning" title="Reverse Entry">
												<RotateCcw class="h-4 w-4" />
											</button>
										</form>
									{/if}
								</div>
							</td>
						</tr>

						{#if expandedEntry === entry.id}
							<tr>
								<td colspan="6" class="bg-base-200/30 p-0">
									<div class="p-4">
										<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
											<div>
												<div class="text-sm font-medium text-gray-500">Fiscal Period</div>
												<div class="mt-1">{entry.fiscalPeriod.name}</div>
											</div>

											<div>
												<div class="text-sm font-medium text-gray-500">Reference</div>
												<div class="mt-1">{entry
.reference || '—'}</div>
											</div>

											<div>
												<div class="text-sm font-medium text-gray-500">Created By</div>
												<div class="mt-1">{entry.createdByUser?.name || '—'}</div>
											</div>

											{#if entry.status === 'POSTED' || entry.status === 'REVERSED'}
												<div>
													<div class="text-sm font-medium text-gray-500">Posted By</div>
													<div class="mt-1">{entry.postedByUser?.name || '—'}</div>
												</div>
											{/if}
										</div>

										<div class="mt-4 overflow-x-auto rounded-lg border">
											<table class="table table-sm">
												<thead class="bg-base-200/70">
													<tr>
														<th class="w-1/3">Account</th>
														<th>Description</th>
														<th class="text-right">Debit</th>
														<th class="text-right">Credit</th>
													</tr>
												</thead>
												<tbody>

													{#each entry.lines as line}
														<tr>
															<td>
																{line.account.code} - {line.account.name}
															</td>
															<td>{line.description || '—'}</td>
															<td class="text-right font-mono">
																{line.debitAmount > 0 ? formatCurrency(line.debitAmount) : ''}
															</td>
															<td class="text-right font-mono">
																{line.creditAmount > 0 ? formatCurrency(line.creditAmount) : ''}
															</td>
														</tr>

													{/each}
													<tr class="bg-base-200/30 font-semibold">
														<td colspan="2
" class="text-right">Total</td>
														<td class="text-right font-mono">{formatCurrency(entry.totalDebit)}</td>
														<td class="text-right font-mono">{formatCurrency(entry.totalCredit)}</td>
													</tr>
												</tbody>
											</table>
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{/each}

					{#if data.entries.length === 0}
						<tr>
							<td colspan="6" class="py-8 text-center text-gray-500">

								{data.filters.searchTerm || data.filters.status || data.filters.startDate || data.filters.endDate
									? 'No journal entries match your search criteria'
									: 'No journal entries found. Create your first entry.'}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Journal Entry Form Modal -->
{#if showForm}
	<div class="modal modal-open">
		<div class="modal-box w-11/12 max-w-5xl p-0">
			<!-- Header -->
			<div class="border-b p-4">
				<h3 class="text-lg font-bold">Create Journal Entry</h3>
			</div>

			<!-- Form -->
			<div class="p-4">
				<form
					bind:this={journalForm}
					method="POST"
					action="?/create"
					use:enhance={handleSubmit()}
					class="space-y-4"
				>
					{#if formError}
						<div class="alert alert-error">
							<AlertTriangle class="h-5 w-5" />
							<span>{formError}</span>
						</div>
					{/if}

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
						<div class="form-control w-full">
							<label class="label" for="number">
								<span class="label-text">Journal Number</span>
							</label>
							<input
								type="text"
								id="number"
								name="number"
								class={`input input-bordered w-full ${formNumberError ? 'input-error' : ''
}`}
								bind:value={journalNumber}
								readonly
							/>
							{#if formNumberError}
								<label class="label">
									<span class="label-text-alt text-error">{formNumberError}</span>
								</label>
							{/if}
						</div>

						<div class="form-control w-full">
							<label class="label" for="date">
								<span class="label-text">Date</span>
							</label>
							<input
								type="date"
								id="date"
								name="date"
								class={`input input-bordered w-full ${formDateError ? 'input-error' : ''}`}
								bind:value={journalDate}
							/>
							{#if formDateError}
								<label class="label">
									<span class="label-text-alt text-error">{formDateError}</span>
								</label>
							{/if}
						</div>

						<div class="form-control w-full">
							<label class="label" for="fiscalPeriodId">
								<span class="label-text">Fiscal Period</span>
							</label>
							<select
								id="fiscalPeriodId"
								name="fiscalPeriodId"
								class="select select-bordered w-full"
								bind:value={journalFiscalPeriodId}
								required
							>
								{#each data.fiscalPeriods.filter(p => !p.isClosed) as period}
									<option value={period.id}>{period.name}</option>
								{/each}
							</select>
						</div>

						<div class="form-control w-full">
							<label class="label" for="reference">
								<span class="label-text">Reference</span>
							</label>
							<input
								type="text"
id="reference"
								name="reference"
								class="input input-bordered w-full"
								placeholder="Optional reference"
								bind:value={journalReference}
							/>
						</div>
					</div>

					<div class="form-control w-full">
						<label class="label" for="description">
							<span class="label-text">Description</span>
						</label>
						<textarea
							id="description"
							name="description"
							class="textarea textarea-bordered w-full"
							rows="2"
							placeholder="Journal entry description"
							bind:value={journalDescription}
							required
						></textarea>
					</div>

					<!-- Journal Lines -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<h4 class="font-medium">Journal Lines</h4>
							<div class="flex gap-2">
								<button
									type="button"
									class="btn btn-outline btn-sm gap-1"
									onclick={autoBalance}
								>
									Auto Balance
								</button>
								<button
									type="button"
									class="btn btn-outline btn-sm gap-1"
									onclick={addJournalLine}
								>
									<Plus class="h-4 w-4" />
									Add Line
								</button>
							</div>
						</div>

						{#if formLinesError}
							<div class="text-sm text-error">{formLinesError}</div>
						{/if}

						<div class="overflow-x-auto rounded-lg border">
							<table class="table table-sm">
								<thead class="bg-base-200">
									<tr>
										<th class="w-1/3">Account</th>
										<th>Description</th>
										<th class="text-right">Debit</th>
										<th class="text-right">Credit</th>
										<th class="w-12"></th>
									</tr>
								</thead>
								<tbody>
									{#each journalLines as line, index}
										<tr>
											<td>
												<select
													name={`lines[${index}].accountId`}
													class="select select-bordered select-sm w-full"
													bind:value={line.accountId}
												>
													<option value="">Select Account</option>
													{#each getAccountOptions() as account}
														<option value={account.id}>
															{account.code} - {account.name}
														</option>
													{/each}
												</select>
											</td>
											<td>
												<input
													type="text"
													name={`lines[${index}].description`}
													class="input input-bordered input-sm w-full"
													placeholder="Line description"
													bind:value={line.description}
												/>
											</td>
											<td>
												<input
													type="number"
													name={`lines[${index}].debitAmount`}
													class="input input-bordered input-sm w-full text-right"
													placeholder="0.00"
													bind:value={line.debitAmount}
													step="0.01"
													min="0"
													onchange={() => {
														if (parseFloat(line.debitAmount) > 0) {
															line.creditAmount = '';
														}
													}}
												/>
											</td>
											<td>
												<input
													type="number"
													name={`lines[${index}].creditAmount`}
													class="input input-bordered input-sm w-full text-right"
													placeholder="0.00"
													bind:value={line.creditAmount}
													step="0.01"
													min="0"
													onchange={() => {
														if (parseFloat(line.creditAmount) > 0) {
															line.debitAmount = '';
														}
													}}
												/>
											</td>
											<td>
												<button
													type="button"
													class="btn btn-ghost btn-xs text-error"
													onclick={() => removeJournalLine(index)}
												>
													<Minus class="h-4 w-4" />
												</button>
											</td>
										</tr>
									{/each}

									{#if journalLines.length > 0}
										{@const { totalDebit, totalCredit, isBalanced } = calculateTotals()}
										<tr class="bg-base-200/30 font-semibold">
											<td colspan="2" class="text-right">Total</td>
											<td class="text-right">{totalDebit}</td>
											<td class="text-right">{totalCredit}</td>
											<td></td>
										</tr>
										<tr>
											<td colspan="5" class="py-0">
												{#if !isBalanced}
													<div class="text-center text-sm text-error">
														Journal entry is not balanced: Difference = {Math.abs(parseFloat(totalDebit) - parseFloat(totalCredit)).toFixed(2)}
													</div>
												{:else}
													<div class="text-center text-sm text-success">
														Journal entry is balanced
													</div>
												{/if}
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					</div>

					<input type="hidden" name="lineCount" value={journalLines.length} />

					<!-- Footer -->
					<div class="modal-action mt-6 border-t p-4">
						<button type="submit" class="btn btn-primary">Save as Draft</button>
						<button
							type="button"
							class="btn"
							onclick={closeJournalForm}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
		<div 
			class="modal-backdrop" 
			onclick={closeJournalForm} 
			role="button" 
			tabindex="0" 
			onkeydown={(e) => e.key === 'Enter' && closeJournalForm()}
		></div>
	</div>
{/if}