<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft, Calendar, Plus, Edit, Lock, Unlock, AlertTriangle } from '@lucide/svelte';

	let { data } = $props();
	let showModal = $state(false);
	let isEditing = $state(false);
	let currentPeriod = $state({
		id: '',
		name: '',
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
		isClosed: false
	});

	const monthNames = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];

	function formatPeriod(year: number, month: number) {
		return `${year} - ${monthNames[month - 1]}`;
	}

	// Open modal for creating a new fiscal period
	function openCreateModal() {
		isEditing = false;

		// Set default to next month after the latest period
		let nextYear = new Date().getFullYear();
		let nextMonth = new Date().getMonth() + 1;

		if (data.periods.length > 0) {
			// Find the latest period
			const latestPeriod = data.periods.reduce((latest, current) => {
				if (
					current.year > latest.year ||
					(current.year === latest.year && current.month > latest.month)
				) {
					return current;
				}
				return latest;
			});

			// Set to next month after latest period
			nextYear = latestPeriod.year;
			nextMonth = latestPeriod.month + 1;

			if (nextMonth > 12) {
				nextMonth = 1;
				nextYear++;
			}
		}

		currentPeriod = {
			id: '',
			name: formatPeriod(nextYear, nextMonth),
			year: nextYear,
			month: nextMonth,
			isClosed: false
		};

		showModal = true;
	}

	// Open modal for editing a fiscal period
	function openEditModal(period) {
		isEditing = true;
		currentPeriod = {
			id: period.id.toString(),
			name: period.name,
			year: period.year,
			month: period.month,
			isClosed: period.isClosed
		};
		showModal = true;
	}

	// Close the modal
	function closeModal() {
		showModal = false;
	}

	// Update period name when year or month changes
	function updatePeriodName() {
		if (currentPeriod.year && currentPeriod.month) {
			currentPeriod.name = formatPeriod(currentPeriod.year, currentPeriod.month);
		}
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

	// Handle close/reopen period
	function handleStatusChange() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Generate year options (current year ± 5 years)
	function getYearOptions() {
		const currentYear = new Date().getFullYear();
		const years = [];
		for (let i = currentYear - 5; i <= currentYear + 5; i++) {
			years.push(i);
		}
		return years;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<div class="flex items-center gap-2">
				<a href="/gl/ledger" class="btn btn-ghost btn-sm px-2">
					<ArrowLeft class="h-4 w-4" />
				</a>
				<h1 class="text-2xl font-bold text-gray-900">Fiscal Periods</h1>
			</div>
			<p class="text-sm text-gray-500">Manage accounting periods for your organization</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-primary btn-sm gap-1" onclick={openCreateModal}>
				<Plus class="h-4 w-4" />
				Add Period
			</button>
		</div>
	</div>

	<!-- Current Period Card -->
	{#if data.currentPeriod}
		<div class="card bg-base-100 border">
			<div class="card-body">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="bg-primary/10 rounded-full p-3">
							<Calendar class="text-primary h-5 w-5" />
						</div>
						<div>
							<h3 class="text-lg font-medium">Current Active Period</h3>
							<p>{data.currentPeriod.name}</p>
						</div>
					</div>
					<div class="badge badge-success">Active</div>
				</div>
				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div>
						<div class="text-sm font-medium text-gray-500">Year</div>
						<div>{data.currentPeriod.year}</div>
					</div>
					<div>
						<div class="text-sm font-medium text-gray-500">Month</div>
						<div>{monthNames[data.currentPeriod.month - 1]}</div>
					</div>
					<div>
						<div class="text-sm font-medium text-gray-500">Status</div>
						<div class="flex items-center">
							<span>Open</span>
							<form method="POST" action="?/close" use:enhance={handleStatusChange}>
								<input type="hidden" name="id" value={data.currentPeriod.id} />
								<button
									type="submit"
									class="btn btn-ghost btn-xs ml-2"
									onclick={(e) => {
										if (
											!confirm(
												'Are you sure you want to close this period? This action cannot be undone.'
											)
										) {
											e.preventDefault();
										}
									}}
								>
									<Lock class="h-3 w-3" />
									<span class="ml-1">Close Period</span>
								</button>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Periods Table -->
	<div class="card bg-base-100 border">
		<div class="overflow-x-auto">
			<table class="table">
				<thead class="bg-base-200">
					<tr>
						<th>Period Name</th>
						<th>Year</th>
						<th>Month</th>
						<th>Status</th>
						<th class="w-32 text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.periods as period}
						<tr class="hover">
							<td class="font-medium">{period.name}</td>
							<td>{period.year}</td>
							<td>{monthNames[period.month - 1]}</td>
							<td>
								{#if period.isClosed}
									<div class="badge badge-ghost">Closed</div>
								{:else}
									<div class="badge badge-success">Open</div>
								{/if}
							</td>
							<td>
								<div class="flex justify-center gap-1">
									<button
										class="btn btn-ghost btn-sm text-primary"
										onclick={() => openEditModal(period)}
										disabled={period.isClosed}
									>
										<Edit class="h-4 w-4" />
									</button>
									{#if period.isClosed}
										<form method="POST" action="?/reopen" use:enhance={handleStatusChange}>
											<input type="hidden" name="id" value={period.id} />
											<button type="submit" class="btn btn-ghost btn-sm">
												<Unlock class="h-4 w-4" />
											</button>
										</form>
									{:else}
										<form method="POST" action="?/close" use:enhance={handleStatusChange}>
											<input type="hidden" name="id" value={period.id} />
											<button
												type="submit"
												class="btn btn-ghost btn-sm"
												onclick={(e) => {
													if (!confirm('Are you sure you want to close this period?')) {
														e.preventDefault();
													}
												}}
											>
												<Lock class="h-4 w-4" />
											</button>
										</form>
									{/if}
								</div>
							</td>
						</tr>
					{/each}

					{#if data.periods.length === 0}
						<tr>
							<td colspan="5" class="py-8 text-center text-gray-500">
								No fiscal periods found. Create your first period.
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
			<div class="font-bold">About Fiscal Periods</div>
			<div class="text-xs">
				Fiscal periods define the accounting timeframes for your organization. When a period is
				closed, no further transactions can be posted to it. Ensure all transactions for a period
				are properly recorded before closing it.
			</div>
		</div>
	</div>
</div>

<!-- Period Form Modal -->
{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-md">
			<h3 class="text-lg font-bold">
				{isEditing ? 'Edit Fiscal Period' : 'Create New Fiscal Period'}
			</h3>
			<form
				method="POST"
				action={isEditing ? '?/update' : '?/create'}
				use:enhance={handleSubmit}
				class="mt-4 space-y-4"
			>
				{#if isEditing}
					<input type="hidden" name="id" value={currentPeriod.id} />
					<input type="hidden" name="isClosed" value={currentPeriod.isClosed} />
				{/if}

				<div class="form-control">
					<label class="label" for="name">
						<span class="label-text">Period Name</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						class="input input-bordered"
						placeholder="e.g. Januari 2024"
						maxlength="100"
						required
						bind:value={currentPeriod.name}
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label" for="year">
							<span class="label-text">Year</span>
						</label>
						<select
							id="year"
							name="year"
							class="select select-bordered"
							required
							bind:value={currentPeriod.year}
							onchange={updatePeriodName}
						>
							<option value="">Select Year</option>
							{#each getYearOptions() as year}
								<option value={year}>{year}</option>
							{/each}
						</select>
					</div>

					<div class="form-control">
						<label class="label" for="month">
							<span class="label-text">Month</span>
						</label>
						<select
							id="month"
							name="month"
							class="select select-bordered"
							required
							bind:value={currentPeriod.month}
							onchange={updatePeriodName}
						>
							<option value="">Select Month</option>
							{#each monthNames as monthName, index}
								<option value={index + 1}>{monthName}</option>
							{/each}
						</select>
					</div>
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
