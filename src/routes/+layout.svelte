<script lang="ts">
	import './layout.css';
	import './global.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" />
	<link rel="manifest" href="/manifest.json" />
	<title>myttendance</title>
</svelte:head>
<main class="mx-auto max-w-xl px-4 py-8">{@render children()}</main>
<p class="pb-4 text-center">
	Made with ❤️ by <a
		class="text-(--primary)"
		target="_blank"
		rel="noreferrer noopener"
		href="https://theanuragmishra.github.io">[Anurag]</a
	>
</p>
