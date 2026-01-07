<script lang="ts">
	let { day, present = 0, absent = 0, onClick, selected = false } = $props();

	let total = $derived(present + absent);
</script>

<button
	class="day-cell relative overflow-hidden"
	onclick={onClick}
	style={selected ? 'border:2px solid blue' : 'border:1px solid black'}
>
	{#if total > 0}
		<div
			class="day-present absolute top-0 left-0 h-full transition-all"
			style={`width: ${(present / total) * 100}%`}
		></div>

		<div
			class="day-absent absolute top-0 right-0 h-full transition-all"
			style={`width: ${(absent / total) * 100}%`}
		></div>
	{/if}

	<div class="relative z-10">
		{day}
	</div>
</button>
