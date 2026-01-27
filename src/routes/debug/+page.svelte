<script>
	import { onMount } from 'svelte';
	let persisted = $state(false);
	onMount(async () => {
		persisted = await navigator.storage.persisted();
	});
</script>

<p>Persistence permission is {persisted}</p>
