<script lang="ts">
	import { flip } from 'svelte/animate';
	import { sineOut } from 'svelte/easing';
	import { ChevronDown, X } from '@lucide/svelte';

	let {
		items = [],
		value = $bindable(),
		placeholder = 'Select an option',
		required = false,
		disabled = false
	} = $props();

	let isOpen = $state(false);
	let searchTerm = $state('');
	let activeIndex = $state(-1);
	let inputElement = $state(null);
	let rootElement = $state(null);

	let filteredItems = $derived(
		items.filter((item) => {
			const itemText = `${item.code} - ${item.name}`.toLowerCase();
			return itemText.includes(searchTerm.toLowerCase());
		})
	);

	function getItemDisplay(item) {
		if (!item) return '';
		return `${item.code} - ${item.name}`;
	}

	$effect(() => {
		const selectedItem = items.find((item) => item.id === value);
		searchTerm = getItemDisplay(selectedItem);
		activeIndex = -1;
	});

	function selectItem(item) {
		value = item.id;
		searchTerm = getItemDisplay(item);
		isOpen = false;
		inputElement?.blur();
	}

	function clearSelection() {
		value = undefined;
		searchTerm = '';
		isOpen = false;
		inputElement?.focus();
	}

	function handleInput(event) {
		searchTerm = event.target.value;
		isOpen = true;
		activeIndex = -1;
	}

	function handleKeydown(event) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!isOpen) isOpen = true;
			activeIndex = (activeIndex + 1) % filteredItems.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (!isOpen) isOpen = true;
			activeIndex = (activeIndex - 1 + filteredItems.length) % filteredItems.length;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (isOpen && activeIndex >= 0) {
				selectItem(filteredItems[activeIndex]);
			}
		} else if (event.key === 'Escape') {
			isOpen = false;
		}
	}

	function handleClickOutside(event) {
		if (rootElement && !rootElement.contains(event.target)) {
			isOpen = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="dropdown dropdown-center w-full" data-open={isOpen} bind:this={rootElement}>
	<div class="relative w-full">
		<input
			bind:this={inputElement}
			type="text"
			class="input input-bordered w-full pr-16"
			{placeholder}
			bind:value={searchTerm}
			onfocus={() => (isOpen = true)}
			oninput={handleInput}
			onkeydown={handleKeydown}
			autocomplete="off"
			{required}
			{disabled}
		/>
		<div class="absolute inset-y-0 right-0 flex items-center pr-2">
			{#if value && !disabled}
				<button
					type="button"
					class="btn btn-ghost btn-circle btn-xs"
					onclick={clearSelection}
					title="Clear selection"
				>
					<X class="hover:text-error h-4 w-4 text-gray-500" />
				</button>
			{/if}

			<button
				type="button"
				class="btn btn-ghost btn-circle btn-xs"
				onclick={() => (isOpen = !isOpen)}
				tabindex="-1"
				{disabled}
			>
				<span class="transition-transform" class:rotate-180={isOpen}>
					<ChevronDown class="h-4 w-4 text-gray-500" />
				</span>
			</button>
		</div>
	</div>

	{#if isOpen && !disabled}
		<ul
			class="dropdown-content bg-base-100 rounded-box z-50 mt-2 max-h-32 w-full overflow-y-auto p-2 shadow-lg"
		>
			{#if filteredItems.length === 0}
				<li class="menu-title px-4 py-2"><span>No accounts found.</span></li>
			{:else}
				{#each filteredItems as item, index (item.id)}
					<li
						animate:flip={{ duration: 200, easing: sineOut }}
						onmouseenter={() => (activeIndex = index)}
					>
						<button
							type="button"
							onclick={() => selectItem(item)}
							class:active={activeIndex === index}
							class="w-full text-left flex gap-2 items-center px-2 py-1"
						>
							<span class="font-mono text-xs">{item.code}</span>
							<span>{item.name}</span>
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>
