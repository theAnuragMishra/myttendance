<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { addSubject, clearAllData, deleteSubject, getAllSubjects, renameSubject } from '$lib/db';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { SubjectWithAttendance } from '$lib/db.js';
	import Modal from '$lib/components/Modal.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	let loading = $state(true);

	//sort features
	let sortOptions = [
		{ type: 'name', value: 'Name' },
		{ type: 'newest', value: 'Newest Date First' },
		{ type: 'attendance_low', value: 'Lowest Attendance First' },
		{ type: 'attendance_high', value: 'Highest Attendance First' }
	];

	let sortStrategy = $state(localStorage.getItem('sortStrategy') ?? 'newest');

	function sortSubjects(strategy: string, subs: Array<SubjectWithAttendance>) {
		//console.log(strategy);
		let sorted = [...subs];
		if (!strategy || strategy === 'name') {
			sorted.sort((a, b) => a.name.localeCompare(b.name));
		} else if (strategy === 'newest') {
			sorted.sort((a, b) => b.createdAt - a.createdAt);
		} else if (strategy === 'attendance_low') {
			sorted.sort((a, b) => {
				let pa = a.total == 0 ? 0 : Math.round((a.present / a.total) * 100);
				let pb = b.total == 0 ? 0 : Math.round((b.present / b.total) * 100);

				if (pa != pb) return pa - pb;
				// i first wrote the next line in flow but suddenly realised it's redundant. what a gotcha!
				// if (a.present != b.present) return a.present - b.present;
				return b.absent - a.absent;
			});
		} else {
			sorted.sort((a, b) => {
				let pa = a.total == 0 ? 0 : Math.round((a.present / a.total) * 100);
				let pb = b.total == 0 ? 0 : Math.round((b.present / b.total) * 100);
				if (pa != pb) return pb - pa;
				// if (a.present != b.present) return a.present - b.present;
				return a.absent - b.absent;
			});
		}
		return sorted;
	}

	let subjects: Array<SubjectWithAttendance> = $state([]);
	let sortedSubjects: Array<SubjectWithAttendance> = $derived.by(() =>
		sortSubjects(sortStrategy, subjects)
	);
	let newSubject = $state('');

	const loadSubjects = async () => {
		subjects = await getAllSubjects();
	};

	onMount(async () => {
		await loadSubjects();
		loading = false;
	});

	const handleAddSubject = async () => {
		if (!newSubject.trim()) return;
		await addSubject(newSubject);
		newSubject = '';
		await loadSubjects();
	};

	const openSubject = (id: string) => {
		goto(resolve(`/subject/${id}`));
	};

	let showDeleteModal = $state(false);
	let subjectToDelete = $state('');
	let subjectToDeleteName = $state('');

	let editing = $state('');
	let newName = $state('');
	let inputEl: HTMLInputElement | undefined = $state();
	let openMenuFor = $state<string | null>(null);

	async function saveRename(id: string, oldName: string) {
		editing = '';
		const trimmed = newName.trim();
		newName = '';
		if (!trimmed || trimmed === oldName) return;
		await renameSubject(id, trimmed);
		await loadSubjects();
	}

	let showSortModal = $state(false);
	let showClearModal = $state(false);

	onMount(() => {
		const onPointerDown = (e: PointerEvent) => {
			if (!openMenuFor) return;
			const target = e.target as HTMLElement | null;
			if (!target) return;

			const root = target.closest(`[data-menu-root="${openMenuFor}"]`);
			if (!root) openMenuFor = null;
		};

		window.addEventListener('pointerdown', onPointerDown, true);
		return () => window.removeEventListener('pointerdown', onPointerDown, true);
	});
</script>

<div class="flex items-center justify-between">
	<h1 class="mb-4 text-2xl">myttendance</h1>
	<button onclick={() => (showSortModal = true)} class="text-(--primary) underline">Sort</button>
</div>

<div class="card flex items-center gap-2">
	<input
		onkeydown={(e: KeyboardEvent) => {
			if (e.key === 'Enter') handleAddSubject();
		}}
		class="primary w-full"
		bind:value={newSubject}
		placeholder="New subject name"
	/>
	<button class="primary" disabled={newSubject.trim().length == 0} onclick={handleAddSubject}
		>Add</button
	>
</div>

{#if loading}
	<Spinner />
{:else}
	<div class="card">
		<ul class="space-y-2">
			{#each sortedSubjects as subject (subject.id)}
				<li class={`flex justify-between gap-5`}>
					{#if editing === subject.id}
						<input
							bind:this={inputEl}
							class={`flex w-full justify-between border border-black px-4 py-2.5 text-[14px]`}
							type="text"
							bind:value={newName}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter') saveRename(subject.id, subject.name);
							}}
						/>
					{:else}
						<button
							class={`border border-black px-4 py-2.5 ${(subject.total != 0 ? Math.round((subject.present / subject.total) * 100) : 0) >= 75 ? 'bg-[#4ade80]' : 'bg-[#f87171]'} flex w-full justify-between gap-2`}
							onclick={() => openSubject(subject.id)}
						>
							<span class="text-left">{subject.name}</span>
							<span
								>{subject.total != 0
									? Math.round((subject.present / subject.total) * 100)
									: 0}%</span
							>
						</button>
					{/if}

					{#if editing === subject.id}
						<span class="flex items-center gap-2">
							<button
								onclick={() => saveRename(subject.id, subject.name)}
								aria-label="save rename"
								class="text-gray-600"
							>
								<svg
									class="h-6 w-6"
									xmlns="http://www.w3.org/2000/svg"
									width="8"
									height="8"
									viewBox="0 0 8 8"
								>
									<path
										fill="currentColor"
										d="m6.41 1l-.69.72L2.94 4.5l-.81-.78L1.41 3L0 4.41l.72.72l1.5 1.5l.69.72l.72-.72l3.5-3.5l.72-.72z"
									/>
								</svg>
							</button>
							<button
								aria-label="cancel rename"
								class="text-gray-600"
								onclick={() => {
									editing = '';
									newName = '';
								}}
							>
								<svg
									class="h-6 w-6"
									xmlns="http://www.w3.org/2000/svg"
									width="15"
									height="15"
									viewBox="0 0 15 15"
								>
									<path
										fill="currentColor"
										d="M3.64 2.27L7.5 6.13l3.84-3.84A.92.92 0 0 1 12 2a1 1 0 0 1 1 1a.9.9 0 0 1-.27.66L8.84 7.5l3.89 3.89A.9.9 0 0 1 13 12a1 1 0 0 1-1 1a.92.92 0 0 1-.69-.27L7.5 8.87l-3.85 3.85A.92.92 0 0 1 3 13a1 1 0 0 1-1-1a.9.9 0 0 1 .27-.66L6.16 7.5L2.27 3.61A.9.9 0 0 1 2 3a1 1 0 0 1 1-1c.24.003.47.1.64.27"
									/>
								</svg>
							</button>
						</span>
					{:else}
						<span class="relative flex items-center" data-menu-root={subject.id}>
							<button
								class="rounded-lg p-2 text-gray-700 active:bg-gray-100"
								aria-label="subject actions"
								aria-haspopup="menu"
								aria-expanded={openMenuFor === subject.id}
								onclick={() => {
									openMenuFor = openMenuFor === subject.id ? null : subject.id;
								}}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
									<path
										fill="currentColor"
										d="M12 16a2 2 0 1 0 0 4a2 2 0 0 0 0-4m0-6a2 2 0 1 0 0 4a2 2 0 0 0 0-4m0-6a2 2 0 1 0 0 4a2 2 0 0 0 0-4"
									/>
								</svg>
							</button>

							{#if openMenuFor === subject.id}
								<div
									class="absolute top-full right-0 z-50 mt-1 w-24 overflow-hidden rounded-lg border border-(--border) bg-white shadow-lg"
									role="menu"
								>
									<button
										role="menuitem"
										class="w-full px-3 py-2.5 text-left text-[14px] text-(--text) active:bg-gray-100"
										onclick={async () => {
											openMenuFor = null;
											editing = subject.id;
											newName = subject.name;
											await tick();
											inputEl!.focus();
											inputEl!.select();
										}}
									>
										Rename
									</button>
									<button
										role="menuitem"
										class="w-full px-3 py-2.5 text-left text-[14px] text-(--danger) active:bg-gray-100"
										onclick={() => {
											openMenuFor = null;
											showDeleteModal = true;
											subjectToDelete = subject.id;
											subjectToDeleteName = subject.name;
										}}
									>
										Delete
									</button>
								</div>
							{/if}
						</span>
					{/if}
				</li>
			{:else}
				Add a subject to start tracking!
			{/each}
		</ul>
	</div>
{/if}

{#if subjects.length}
	<p class="text-center">
		<button onclick={() => (showClearModal = true)} class="text-(--primary) underline"
			>Clear All Subjects</button
		>
	</p>
{/if}

<Modal bind:showModal={showDeleteModal}>
	{#snippet confirmButton()}
		<button
			class="danger px-4 py-1"
			onclick={async () => {
				await deleteSubject(subjectToDelete);
				await loadSubjects();
				showDeleteModal = false;
			}}>Confirm</button
		>
	{/snippet}
	<h1 class="mb-2 text-2xl">{`Delete ${subjectToDeleteName}?`}</h1>

	<p class="mb-4">{`This will permanently delete all attendance records for the subject!`}</p>
</Modal>

<Modal bind:showModal={showSortModal}>
	{#snippet confirmButton()}{/snippet}
	<div class="mb-4 flex items-center justify-end gap-2">
		<span>Sort By:</span><select
			onchange={() => {
				localStorage.setItem('sortStrategy', sortStrategy);
				showSortModal = false;
			}}
			bind:value={sortStrategy}
			class="w-fit border px-2 py-0.5"
		>
			{#each sortOptions as opt}
				<option value={opt.type}>{opt.value}</option>
			{/each}
		</select>
	</div>
</Modal>

<Modal bind:showModal={showClearModal}>
	{#snippet confirmButton()}
		<button
			class="danger px-4 py-1"
			onclick={async () => {
				await clearAllData();
				await loadSubjects();
				showClearModal = false;
			}}>Confirm</button
		>
	{/snippet}
	<h1 class="mb-2 text-2xl">{`Clear all subjects?`}</h1>

	<p class="mb-4">
		{`This will permanently delete all attendance records for all the subjects! Use this when you're starting a new semester.`}
	</p>
</Modal>
