<script lang="ts">
	let stats = [
		{ title: 'Total Aset', value: '31', desc: 'Januari 2024' },
		{ title: 'Nilai Total Aset', value: 'Rp 4.2M', desc: '↗︎ 400K (22%)' },
		{ title: 'Penyusutan', value: 'Rp 850K', desc: '↘︎ 90K (14%)' }
	];
</script>

<div class="space-y-6">
	<div class="grid gap-6 md:grid-cols-3">
		{#each stats as stat}
			<div class="rounded-lg border bg-white p-6">
				<div class="text-sm font-medium text-gray-500">{stat.title}</div>
				<div class="mt-2 text-2xl font-bold text-gray-900">{stat.value}</div>
				<div class="mt-1 text-xs text-gray-500">{stat.desc}</div>
			</div>
		{/each}
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
		<div class="col-span-4 rounded-lg border bg-white">
			<div class="p-6">
				<h3 class="text-lg font-medium text-gray-900">Overview</h3>
				<!-- Grafik -->
			</div>
		</div>

		<div class="col-span-3 rounded-lg border bg-white">
			<div class="p-6">
				<h3 class="text-lg font-medium text-gray-900">Recent Activities</h3>
				<!-- Aktivitas -->
			</div>
		</div>
	</div>
</div>
