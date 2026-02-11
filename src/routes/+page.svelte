<script lang="ts">
	import { onMount, tick } from 'svelte';
	import {
		addSubject,
		clearAllData,
		deleteSubject,
		renameSubject,
		getTimeSlotsForDay
	} from '$lib/db';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import Modal from '$lib/components/Modal.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { appState } from '$lib/state.svelte';

	onMount(async () => {
		await appState.initialize();
	});

	const handleAddSubject = async () => {
		if (!appState.newSubject.trim()) return;
		await addSubject(appState.newSubject);
		appState.newSubject = '';
		await appState.loadSubjects();
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
		await appState.loadSubjects();
	}

	let showSortModal = $state(false);
	let showClearModal = $state(false);
</script>

{#if openMenuFor}
	<div
		class="fixed inset-0 z-40 bg-black/5"
		onpointerdown={(e: PointerEvent) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			openMenuFor = null;
		}}
	></div>
{/if}

<div class="flex items-center justify-between">
	<h1 class="mb-4 text-2xl">myttendance</h1>
	<div class="flex items-center gap-3">
		<button onclick={appState.toggleTimetableMode} class="text-(--primary) underline">
			{appState.timetableMode ? 'Day' : 'All'}
		</button>
		<button onclick={() => (showSortModal = true)} class="text-(--primary) underline">
			Sort
		</button>
	</div>
</div>

<div class="card flex items-center gap-2">
	<input
		onkeydown={(e: KeyboardEvent) => {
			if (e.key === 'Enter') handleAddSubject();
		}}
		class="primary w-full"
		bind:value={appState.newSubject}
		placeholder="New subject name"
	/>
	<button
		class="primary"
		disabled={appState.newSubject.trim().length == 0}
		onclick={handleAddSubject}>Add</button
	>
</div>

{#if appState.timetableMode}
	<div class="my-2 flex w-full items-center justify-center gap-2">
		<button
			onclick={appState.goToPreviousDay}
			class="rounded-lg border border-(--border) p-1.5 active:bg-gray-100"
			aria-label="Previous day"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
				<path fill="currentColor" d="M15.41 7.41L14 6l-6 6l6 6l1.41-1.41L10.83 12z" />
			</svg>
		</button>
		<button onclick={appState.goToToday} class="min-w-30 px-4 py-1.5 font-medium">
			{appState.selectedDayOffset === 0 ? 'Today' : appState.selectedDayName}
		</button>
		<button
			onclick={appState.goToNextDay}
			class="rounded-lg border border-(--border) p-1.5 active:bg-gray-100"
			aria-label="Next day"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
				<path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z" />
			</svg>
		</button>
	</div>
{/if}

{#if appState.loading}
	<Spinner />
{:else}
	<div class="card">
		<ul class="space-y-2">
			{#each appState.filteredSubjects as subject (subject.id)}
				<li class={`flex justify-between gap-2`}>
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
							class={`rounded-lg border border-black px-4 py-2.5 ${(subject.total != 0 ? Math.round((subject.present / subject.total) * 100) : 0) >= 75 ? 'bg-[#4ade80]' : 'bg-[#f87171]'} flex w-full flex-col gap-1`}
							onclick={() => openSubject(subject.id)}
						>
							<div class="flex w-full items-start justify-between gap-2">
								<span class="text-left font-medium">{subject.name}</span>
								<span class="shrink-0">
									{subject.total != 0 ? Math.round((subject.present / subject.total) * 100) : 0}%
								</span>
							</div>

							{#if appState.timetableMode || subject.daysToGreen > 0}
								<div class="flex w-full items-end justify-between gap-2">
									<span class="text-[11px] opacity-80">
										{#if appState.timetableMode && subject.timetableSlots}
											{getTimeSlotsForDay(subject.timetableSlots, appState.selectedDay)}
										{/if}
									</span>
									<span class="shrink-0 text-[11px] opacity-80">
										{#if subject.daysToGreen > 0}
											{subject.daysToGreen}
											{subject.daysToGreen === 1 ? 'day' : 'days'} to 75%
										{/if}
									</span>
								</div>
							{/if}
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
						<span
							class={`relative flex items-center ${openMenuFor === subject.id ? 'z-50' : ''}`}
							data-menu-root={subject.id}
						>
							<button
								class="rounded-lg text-gray-700 active:bg-gray-100"
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
				{#if appState.timetableMode}
					<p class="text-center text-gray-600">
						No classes scheduled for {appState.selectedDayOffset === 0
							? 'today'
							: appState.selectedDayName}.
					</p>
				{:else}
					<p class="text-center text-gray-600">Add a subject to start tracking!</p>
				{/if}
			{/each}
		</ul>
	</div>
{/if}

{#if appState.subjects.length}
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
				await appState.loadSubjects();
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
			onchange={(e) => {
				const value = e.currentTarget.value;
				if (appState.timetableMode) {
					appState.sortStrategyToday = value;
					localStorage.setItem('sortStrategyToday', value);
				} else {
					appState.sortStrategyAll = value;
					localStorage.setItem('sortStrategyAll', value);
				}
				showSortModal = false;
			}}
			value={appState.sortStrategy}
			class="w-fit border px-2 py-0.5"
		>
			{#each appState.sortOptions as opt}
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
				await appState.loadSubjects();
				showClearModal = false;
			}}>Confirm</button
		>
	{/snippet}
	<h1 class="mb-2 text-2xl">{`Clear all subjects?`}</h1>

	<p class="mb-4">
		{`This will permanently delete all attendance records for all the subjects! Use this when you're starting a new semester.`}
	</p>
</Modal>
