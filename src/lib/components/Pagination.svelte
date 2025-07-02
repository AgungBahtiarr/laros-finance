<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	type Props = {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
	};

	let { currentPage, totalPages, onPageChange }: Props = $props();

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			onPageChange(page);
		}
	}

	const pages = $derived.by(() => {
		const pageArray: (number | string)[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) {
				pageArray.push(i);
			}
			return pageArray;
		}

		// Always show first page
		pageArray.push(1);

		// Logic for ellipsis
		if (currentPage > 3) {
			pageArray.push('...');
		}

		let start = Math.max(2, currentPage - 1);
		let end = Math.min(totalPages - 1, currentPage + 1);

		if (currentPage <= 2) {
			start = 2;
			end = 3;
		}

		if (currentPage >= totalPages - 1) {
			start = totalPages - 2;
			end = totalPages - 1;
		}

		for (let i = start; i <= end; i++) {
			pageArray.push(i);
		}

		if (currentPage < totalPages - 2) {
			pageArray.push('...');
		}

		// Always show last page
		pageArray.push(totalPages);

		return pageArray;
	});
</script>

{#if totalPages > 1}
	<div class="join">
		<button
			class="join-item btn btn-sm"
			onclick={() => goToPage(currentPage - 1)}
			disabled={currentPage === 1}
		>
			<ChevronLeft class="h-4 w-4" />
			Prev
		</button>

		{#each pages as page}
			{#if page === '...'}
				<button class="join-item btn btn-sm btn-disabled">...</button>
			{:else}
				<button
					class="join-item btn btn-sm"
					class:btn-active={page === currentPage}
					onclick={() => goToPage(page as number)}
				>
					{page}
				</button>
			{/if}
		{/each}

		<button
			class="join-item btn btn-sm"
			onclick={() => goToPage(currentPage + 1)}
			disabled={currentPage === totalPages}
		>
			Next
			<ChevronRight class="h-4 w-4" />
		</button>
	</div>
{/if}
