<script lang="ts">
	import { onMount } from 'svelte';
	import { addSubject, deleteSubject, getAllSubjects, getAttendance } from '$lib/db';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Subject } from '$lib/db.js';
	import Modal from '$lib/components/Modal.svelte';

	let subjects: Array<Subject> = $state([]);
	let percentages: Record<string, number> = $state({});
	let newSubject = $state('');

	const loadSubjects = async () => {
		subjects = await getAllSubjects();
		for (let s of subjects) {
			const { present, total } = await getAttendance(s.id);
			percentages[s.id] = total != 0 ? Math.round((present / total) * 100) : 0;
		}
	};

	onMount(loadSubjects);

	const handleAddSubject = async () => {
		if (!newSubject.trim()) return;
		await addSubject(newSubject);
		newSubject = '';
		await loadSubjects();
	};

	const openSubject = (id: string) => {
		goto(resolve(`/subject/${id}`));
	};

	let showModal = $state(false);
	let subjectToDelete = $state('');
	let subjectToDeleteName = $state('');
</script>

<h1 class="mb-4 text-2xl">myttendance</h1>

<div class="card">
	<input bind:value={newSubject} placeholder="New subject name" />
	<button class="primary" disabled={newSubject.trim().length == 0} onclick={handleAddSubject}
		>Add</button
	>
</div>

<div class="card">
	<ul class="space-y-2">
		{#each subjects as subject, i (i)}
			<li class={`flex justify-between gap-5`}>
				<button
					class={`px-4 py-2.5 ${percentages[subject.id] >= 75 ? 'bg-[#dcfce7] text-(--success)' : 'bg-[#fee2e2] text-(--danger)'} flex w-full justify-between`}
					onclick={() => openSubject(subject.id)}
				>
					<span>{subject.name}</span>
					<span>{percentages[subject.id]}%</span>
				</button>
				<button
					aria-label="delete"
					class="text-(--danger)"
					onclick={() => {
						showModal = true;
						subjectToDelete = subject.id;
						subjectToDeleteName = subject.name;
					}}
					><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><path
							fill="currentColor"
							d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"
						/></svg
					></button
				>
			</li>
		{:else}
			Add a subject to start tracking!
		{/each}
	</ul>
</div>

<Modal
	bind:showModal
	subjectName={subjectToDeleteName}
	handleDeletion={async () => {
		await deleteSubject(subjectToDelete);
		await loadSubjects();
	}}
/>
