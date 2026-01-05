<script>
	let { showModal = $bindable(), subjectName, handleDeletion } = $props();

	let dialog = $state(); // HTMLDialogElement

	$effect(() => {
		if (showModal) dialog.showModal();
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	onclose={() => (showModal = false)}
	onclick={(e) => {
		if (e.target === dialog) dialog.close();
	}}
>
	<div>
		<h1 class="mb-2 text-2xl">Delete {subjectName}?</h1>

		<p class="mb-2">This will permanently delete all attendance records for the subject!</p>

		<div class="flex justify-end gap-2">
			<!-- svelte-ignore a11y_autofocus -->
			<button class="bg-(--muted) px-4 py-1" autofocus onclick={() => dialog.close()}>Cancel</button
			>
			<button
				class="danger px-4 py-1"
				onclick={async () => {
					await handleDeletion();
					dialog.close();
				}}>Delete</button
			>
		</div>
	</div>
</dialog>

<style>
	dialog {
		max-width: 32em;
		border-radius: 0.2em;
		border: none;
		padding: 0;
		margin: auto;
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}
	dialog > div {
		padding: 1em;
	}
	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
