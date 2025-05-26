<script>
	import { enhance } from '$app/forms';

	const { isEditing, handleSubmit, currentGroup, accountTypes, closeModal } = $props();
</script>

<div class="modal modal-open">
	<div class="modal-box max-w-md">
		<h3 class="text-lg font-bold">
			{isEditing ? 'Edit Account Group' : 'Create Account Group'}
		</h3>
		<form
			method="POST"
			action={isEditing ? '?/update' : '?/create'}
			use:enhance={handleSubmit}
			class="mt-4 space-y-4"
		>
			{#if isEditing}
				<input type="hidden" name="id" value={currentGroup.id} />
			{/if}

			<div class="form-control">
				<label class="label" for="code">
					<span class="label-text">Group Code</span>
				</label>
				<input
					type="text"
					id="code"
					name="code"
					class="input input-bordered"
					placeholder="e.g. CASH_AND_EQUIV"
					maxlength="20"
					required
					bind:value={currentGroup.code}
				/>
				<label class="label" for="code">
					<span class="label-text-alt">Unique identifier for the account group</span>
				</label>
			</div>

			<div class="form-control">
				<label class="label" for="name">
					<span class="label-text">Name</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					class="input input-bordered"
					placeholder="e.g. Cash and Cash Equivalents"
					maxlength="100"
					required
					bind:value={currentGroup.name}
				/>
			</div>

			<div class="form-control">
				<label class="label" for="accountTypeId">
					<span class="label-text">Account Type</span>
				</label>
				<select
					id="accountTypeId"
					name="accountTypeId"
					class="select select-bordered"
					required
					bind:value={currentGroup.accountTypeId}
				>
					<option value="" disabled>Select Account Type</option>
					{#each accountTypes as type}
						<option value={type.id.toString()}>{type.name}</option>
					{/each}
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
					bind:value={currentGroup.description}
				></textarea>
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
