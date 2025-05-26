<script>
	import { enhance } from '$app/forms';

	let { isEditing, handleSubmit, currentType, closeModal } = $props();
</script>

<div class="modal modal-open">
	<div class="modal-box max-w-md">
		<h3 class="text-lg font-bold">
			{isEditing ? 'Edit Account Type' : 'Create Account Type'}
		</h3>
		<form
			method="POST"
			action={isEditing ? '?/update' : '?/create'}
			use:enhance={handleSubmit}
			class="mt-4 space-y-4"
		>
			{#if isEditing}
				<input type="hidden" name="id" value={currentType.id} />
			{/if}

			<div class="form-control">
				<label class="label" for="code">
					<span class="label-text">Code</span>
				</label>
				<input
					type="text"
					id="code"
					name="code"
					class="input input-bordered"
					placeholder="e.g. ASSET"
					maxlength="10"
					required
					bind:value={currentType.code}
				/>
				<label class="label" for="code">
					<span class="label-text-alt">Unique identifier for the account type</span>
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
					placeholder="e.g. Asset"
					maxlength="100"
					required
					bind:value={currentType.name}
				/>
			</div>

			<div class="form-control">
				<label class="label" for="normalBalance">
					<span class="label-text">Normal Balance</span>
				</label>
				<select
					id="normalBalance"
					name="normalBalance"
					class="select select-bordered"
					required
					bind:value={currentType.normalBalance}
				>
					<option value="DEBIT">DEBIT</option>
					<option value="CREDIT">CREDIT</option>
				</select>
				<label class="label" for="normalBalance">
					<span class="label-text-alt">The side that increases this account type's balance</span>
				</label>
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
