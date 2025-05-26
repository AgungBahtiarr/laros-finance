<script>
	import { enhance } from '$app/forms';

	let {
		isEditing,
		formData,
		formElement,
		handleSubmit,
		data,
		closeForm,
		getValidParentOptions,
		handleParentChange
	} = $props();
</script>

<div class="modal modal-open">
	<div class="modal-box w-11/12 max-w-3xl">
		<h3 class="text-lg font-bold">
			{isEditing ? `Edit Account: ${formData.code} - ${formData.name}` : 'Create New Account'}
		</h3>
		<form
			bind:this={formElement}
			method="POST"
			action={isEditing ? '?/update' : '?/create'}
			use:enhance={handleSubmit}
			class="mt-4"
		>
			{#if isEditing}
				<input type="hidden" name="id" value={formData.id} />
			{/if}

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="form-control w-full">
					<label class="label" for="code">
						<span class="label-text">Account Code</span>
					</label>
					<input
						id="code"
						name="code"
						type="text"
						class="input input-bordered w-full"
						placeholder="e.g. 1000"
						required
						maxlength="20"
						bind:value={formData.code}
					/>
				</div>

				<div class="form-control w-full">
					<label class="label" for="name">
						<span class="label-text">Account Name</span>
					</label>
					<input
						id="name"
						name="name"
						type="text"
						class="input input-bordered w-full"
						placeholder="e.g. Cash"
						required
						maxlength="255"
						bind:value={formData.name}
					/>
				</div>

				<div class="form-control w-full">
					<label class="label" for="accountGroupId">
						<span class="label-text">Account Group</span>
					</label>
					<select
						id="accountGroupId"
						name="accountGroupId"
						class="select select-bordered w-full"
						bind:value={formData.accountGroupId}
					>
						<option value="">Select Account Group</option>
						{console.log(data.accountGroups)}
						{#each data.accountGroups as group}
							<option value={group.id.toString()}>
								{group.code} - {group.name} ({group.accountType.name})
							</option>
						{/each}
					</select>
					<label for="accountGroupId" class="label">
						<span class="label-text-alt">Functional grouping for financial reports</span>
					</label>
				</div>

				<div class="form-control w-full">
					<label class="label" for="parentId">
						<span class="label-text">Parent Account</span>
					</label>
					<select
						id="parentId"
						name="parentId"
						class="select select-bordered w-full"
						bind:value={formData.parentId}
						onchange={handleParentChange}
					>
						<option value="">No Parent (Level 1)</option>
						{#each getValidParentOptions(data.accounts, isEditing ? formData.id : null) as account}
							<option value={account.id.toString()}>
								{account.code} - {account.name}
							</option>
						{/each}
					</select>
				</div>

				<input type="hidden" name="level" bind:value={formData.level} />

				<div class="form-control w-full">
					<label class="label" for="balanceType">
						<span class="label-text">Account Type</span>
					</label>
					<input
						id="accountType"
						name="accountType"
						type="text"
						class="input input-bordered w-full"
						placeholder="e.g. 1000"
						readonly
						maxlength="20"
					/>
					<label for="balanceType" class="label">
						<span class="label-text-alt">Normal balance for this account</span>
					</label>
				</div>

				<div class="form-control col-span-1 md:col-span-2">
					<label class="label" for="description">
						<span class="label-text">Description</span>
					</label>
					<textarea
						id="description"
						name="description"
						class="textarea textarea-bordered h-24"
						placeholder="Optional description"
						bind:value={formData.description}
					></textarea>
				</div>
			</div>

			<div class="modal-action mt-6">
				<button type="submit" class="btn btn-primary">
					{isEditing ? 'Update Account' : 'Create Account'}
				</button>
				<button type="button" class="btn" onclick={closeForm}>Cancel</button>
			</div>
		</form>
	</div>
	<div
		class="modal-backdrop"
		onclick={closeForm}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && closeForm()}
	></div>
</div>
