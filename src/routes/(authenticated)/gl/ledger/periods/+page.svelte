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
		startDate: '',
		endDate: '',
		isClosed: false
	});

	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	function formatDateValue(dateString) {
		const date = new Date(dateString);
		return date.toISOString().split('T')[0];
	}

	// Open modal for creating a new fiscal period
	function openCreateModal() {
		isEditing = false;
		// Set default dates to next month after the latest period
		let startDate = new Date();
		let endDate = new Date();

		if (data.periods.length > 0) {
			const latestPeriod = data.periods[0]; // Periods are ordered by startDate desc
			const latestEndDate = new Date(latestPeriod.endDate);
			
			// Start day after the latest end date
			startDate = new Date(latestEndDate);
			startDate.setDate(latestEndDate.getDate() + 1);
			
			// End date one month after start date
			endDate = new Date(startDate);
			endDate.setMonth(endDate.getMonth() + 1);
			endDate.setDate(endDate.getDate() - 1);
		} else {
			// If no periods exist, default to current month
			startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
			endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
		}

		currentPeriod = {
			id: '',
			name: `${startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
			startDate: formatDateValue(startDate),
			endDate: formatDateValue(endDate),
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
			startDate: formatDateValue(period.startDate),
			endDate: formatDateValue(period.endDate),
			isClosed: period.isClosed
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

	// Handle close/reopen period
	function handleStatusChange() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto(page.url.pathname, { invalidateAll: true });
			}
		};
	}

	// Generate month name from date
	function getMonthName(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
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
		<div class="card border bg-base-100">
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
						<div class="text-sm font-medium text-gray-500">Start Date</div>
						<div>{formatDate(data.currentPeriod.startDate)}</div>
					</div>
					<div>
						<div class="text-sm font-medium text-gray-500">End Date</div>
						<div>{formatDate(data.currentPeriod.endDate)}</div>
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
										if (!confirm('Are you sure you want to close this period? This action cannot be undone.')) {
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
						<th>Start Date</th>
						<th>End Date</th>
						<th>Status</th>
						<th class="w-32 text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.periods as period}
						<tr class="hover">
							<td class="font-medium">{period.name}</td>
							<td>{formatDate(period.startDate)}</td>
							<td>{formatDate(period.endDate)}</td>
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
				closed, no further transactions can be posted to it. Ensure all transactions for a period are
				properly recorded before closing it.
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
						placeholder="e.g. January 2024"
						maxlength="100"
						required
						bind:value={currentPeriod.name}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="startDate">
						<span class="label-text">Start Date</span>
					</label>
					<input
						type="date"
						id="startDate"
						name="startDate"
						class="input input-bordered"
						required
						bind:value={currentPeriod.startDate}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="endDate">
						<span class="label-text">End Date</span>
					</label>
					<input
						type="date"
						id="endDate"
						name="endDate"
						class="input input-bordered"
						required
						bind:value={currentPeriod.endDate}
					/>
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