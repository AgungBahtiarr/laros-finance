<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		ArrowLeft,
		FileText,
		Calendar,
		Filter,
		Plus,
		Edit,
		Download,
		Printer,
		Trash2,
		FileSpreadsheet,
		AlertTriangle
	} from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let showFilters = $state(true);
	let showNewTemplateModal = $state(false);

	// Filter state
	let templateId = $state(data.filters.templateId);
	let fiscalPeriodId = $state(data.filters.fiscalPeriodId);
	let asOfDate = $state(data.filters.asOfDate);

	// New template form
	let newTemplate = $state({
		name: '',
		type: 'BALANCE_SHEET',
		description: ''
	});

	// Format amount as currency
	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(parseFloat(amount) || 0);
	}

	// Format date for display
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Apply filters
	function applyFilters() {
		const searchParams = new URLSearchParams();

		if (templateId) searchParams.set('templateId', templateId);
		if (fiscalPeriodId) searchParams.set('fiscalPeriodId', fiscalPeriodId);
		if (asOfDate) searchParams.set('asOfDate', asOfDate);

		goto(`?${searchParams.toString()}`);
	}

	// Reset filters
	function resetFilters() {
		templateId = '';
		fiscalPeriodId = '';
		asOfDate = '';

		goto('/gl/ledger/reports');
	}

	// Handle new template form
	function handleNewTemplateSubmit() {
		return async ({ result }) => {
			if (result.type === 'success') {
				showNewTemplateModal = false;
				
				// Navigate to the new template
				if (result.data && result.data.templateId) {
					goto(`?templateId=${result.data.templateId}`);
				} else {
					goto(page.url.pathname, { invalidateAll: true });
				}
			}
		};
	}

	// Handle template deletion
	function handleTemplateDelete() {
		return async ({ result }) => {
			if (result.type === 'success') {
				goto('/gl/ledger/reports', { invalidateAll: true });
			}
		};
	}

	// Print report
	function printReport() {
		window.print();
	}

	// Export report to CSV
	function exportReportToCSV() {
		if (!data.reportData) return;

		// Create CSV content
		let csvContent = `"${data.reportData.template.name}"\n`;
		csvContent += `"${formatDate(data.reportData.startDate)} to ${formatDate(
			data.reportData.endDate
		)}"\n\n`;
		csvContent += '"Line","Description","Amount"\n';

		// Add report lines
		for (const lineResult of data.reportData.lineResults) {
			const line = lineResult.line;
			const value = lineResult.value;
			
			// Skip certain line types or add indentation
			let prefix = '';
			let lineValue = '';
			
			if (line.type === 'HEADER') {
				prefix = '';
			} else if (line.parentLineId) {
				prefix = '  ';
			}
			
			if (line.type !== 'HEADER') {
				lineValue = formatCurrency(value);
			}
			
			csvContent += `"${line.lineNumber}","${prefix}${line.label}","${lineValue}"\n`;
		}

		// Create download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		
		link.setAttribute('href', url);
		link.setAttribute('download', `${data.reportData.template.name.replace(/\s/g, '_')}_Report.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<div class="space-y-6 print:space-y-4">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
		<div>
			<div class="flex items-center gap-2">
				<a href="/gl/ledger" class="btn btn-ghost btn-sm px-2">
					<ArrowLeft class="h-4 w-4" />
				</a>
				<h1 class="text-2xl font-bold text-gray-900">Financial Reports</h1>
			</div>
			<p class="text-sm text-gray-500">Generate and view standard financial reports</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-outline btn-sm gap-1" onclick={() => (showFilters = !showFilters)}>
				<Filter class="h-4 w-4" />
				{showFilters ? 'Hide Filters' : 'Show Filters'}
			</button>
			<button class="btn btn-primary btn-sm gap-1" onclick={() => (showNewTemplateModal = true)}>
				<Plus class="h-4 w-4" />
				New Template
			</button>
		</div>
	</div>

	<!-- Filters -->
	{#if showFilters}
		<div class="card border bg-base-100 print:hidden">
			<div class="card-body p-4">
				<h3 class="card-title text-lg">Report Filters</h3>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div class="form-control w-full">
						<label class="label" for="templateId">
							<span class="label-text">Report Template</span>
						</label>
						<select id="templateId" class="select select-bordered w-full" bind:value={templateId}>
							<option value="">Select Report Template</option>
							{#each data.templates as template}
								<option value={template.id}>{template.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="fiscalPeriodId">
							<span class="label-text">Fiscal Period</span>
						</label>
						<select id="fiscalPeriodId" class="select select-bordered w-full" bind:value={fiscalPeriodId}>
							<option value="">Current Period</option>
							{#each data.fiscalPeriods as period}
								<option value={period.id}>{period.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="asOfDate">
							<span class="label-text">As of Date</span>
						</label>
						<input
							type="date"
							id="asOfDate"
							class="input input-bordered w-full"
							bind:value={asOfDate}
							placeholder="Custom date"
						/>
					</div>
				</div>

				<div class="mt-4 flex justify-end gap-2">
					<button class="btn btn-outline btn-sm" onclick={resetFilters}>Reset</button>
					<button class="btn btn-primary btn-sm" onclick={applyFilters}>Generate Report</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- No Template Selected Message -->
	{#if !data.selectedTemplate && !data.reportData}
		<div class="card border bg-base-100">
			<div class="card-body p-8 text-center">
				<FileText class="mx-auto h-16 w-16 text-gray-300" />
				<h3 class="mt-4 text-xl font-bold">Select a Report Template</h3>
				<p class="mt-2 text-gray-500">
					Choose a report template from the dropdown menu to generate a financial report.
				</p>
				{#if data.templates.length === 0}
					<div class="mt-4">
						<p class="font-medium text-gray-600">No report templates found</p>
						<button
							class="btn btn-primary btn-sm mt-2"
							onclick={() => (showNewTemplateModal = true)}
						>
							Create Your First Template
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Report View -->
	{#if data.selectedTemplate && data.reportData}
		<div id="report-container" class="card border bg-base-100 print:border-0 print:shadow-none">
			<div class="card-body p-6 print:p-0">
				<!-- Report Header -->
				<div class="flex flex-col justify-between border-b pb-4 print:flex-row print:items-center">
					<div>
						<h2 class="text-2xl font-bold">{data.reportData.template.name}</h2>
						<p class="text-gray-500">
							{formatDate(data.reportData.startDate)} to {formatDate(data.reportData.endDate)}
						</p>
					</div>
					<div class="mt-4 flex gap-2 print:hidden">
						<button class="btn btn-outline btn-sm gap-1" onclick={printReport}>
							<Printer class="h-4 w-4" />
							Print
						</button>
						<button class="btn btn-outline btn-sm gap-1" onclick={exportReportToCSV}>
							<FileSpreadsheet class="h-4 w-4" />
							Export CSV
						</button>
						<form method="POST" action="?/deleteTemplate" use:enhance={handleTemplateDelete}>
							<input type="hidden" name="templateId" value={data.selectedTemplate.id} />
							<button
								type="submit"
								class="btn btn-ghost btn-sm text-error"
								onclick={(e) => {
									if (!confirm('Are you sure you want to delete this report template?')) {
										e.preventDefault();
									}
								}}
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</form>
					</div>
				</div>

				<!-- Report Content -->
				<div class="mt-4 overflow-x-auto py-4">
					<table class="w-full">
						<tbody>
							{#each data.reportData.lineResults as lineResult}
								{@const line = lineResult.line}
								{@const value = lineResult.value}
								<tr>
									{#if line.type === 'HEADER'}
										<td colspan="2" class={`pb-2 pt-4 ${line.bold ? 'font-bold text-lg' : 'font-medium'}`}>
											{line.label}
										</td>
									{:else}
										<td
											class={`py-1 ${line.parentLineId ? 'pl-6' : ''} ${
												line.bold ? 'font-bold' : ''
											} ${
												line.type === 'TOTAL' || line.type === 'SUBTOTAL'
													? 'border-t pt-2 font-medium'
													: ''
											}`}
										>
											{line.label}
										</td>
										<td
											class={`py-1 text-right tabular-nums ${
												line.bold ? 'font-bold' : ''
											} ${
												line.type === 'TOTAL' || line.type === 'SUBTOTAL'
													? 'border-t pt-2 font-medium'
													: ''
											}`}
										>
											{formatCurrency(value)}
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Report Footer -->
				<div class="mt-4 border-t pt-4 text-sm text-gray-500">
					<p>Generated on {new Date().toLocaleDateString('id-ID')}</p>
					{#if data.selectedTemplate.description}
						<p class="mt-1">{data.selectedTemplate.description}</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- New Template Modal -->
{#if showNewTemplateModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-md">
			<h3 class="text-lg font-bold">Create New Report Template</h3>
			<form
				method="POST"
				action="?/saveReportTemplate"
				use:enhance={handleNewTemplateSubmit}
				class="mt-4 space-y-4"
			>
				<div class="form-control">
					<label class="label" for="name">
						<span class="label-text">Template Name</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						class="input input-bordered"
						placeholder="e.g. Balance Sheet"
						maxlength="100"
						required
						bind:value={newTemplate.name}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="type">
						<span class="label-text">Report Type</span>
					</label>
					<select
						id="type"
						name="type"
						class="select select-bordered"
						required
						bind:value={newTemplate.type}
					>
						<option value="BALANCE_SHEET">Balance Sheet</option>
						<option value="INCOME_STATEMENT">Income Statement</option>
						<option value="CASH_FLOW">Cash Flow Statement</option>
						<option value="CUSTOM">Custom Report</option>
					</select>
				</div>

				<div class="form-control">
					<label class="label" for="description">
						<span class="label-text">Description</span>
					</label>
					<textarea
						id="description"
						name="description"
						class="textarea textarea-bordered"
						rows="3"
						placeholder="Optional description"
						bind:value={newTemplate.description}
					></textarea>
				</div>

				<div class="modal-action">
					<button type="submit" class="btn btn-primary">Create Template</button>
					<button
						type="button"
						class="btn"
						onclick={() => (showNewTemplateModal = false)}
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
			onclick={() => (showNewTemplateModal = false)}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && (showNewTemplateModal = false)}
		></div>
	</div>
{/if}