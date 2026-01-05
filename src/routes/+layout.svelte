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
<main class="mx-auto max-w-3xl px-4 py-8">{@render children()}</main>
<p class="text-center">Made with ❤️ by Anurag</p>
