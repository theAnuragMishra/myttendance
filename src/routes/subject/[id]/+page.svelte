<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getAttendanceForMonth,
		markAttendance,
		getAttendance,
		getSubjectById,
		clearAttendanceForSubject,
		getTimetableSlotsForSubject,
		addTimetableSlot,
		deleteTimetableSlot,
		checkSlotOverlap,
		TIME_SLOTS,
		DAYS_OF_WEEK,
		formatTimeSlot,
		type Subject,
		type TimetableSlot
	} from '$lib/db';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Modal from '$lib/components/Modal.svelte';
	import AttendanceCell from '$lib/components/AttendanceCell.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	type CalendarCell = {
		day: number;
		date: string;
		attendance: { present: number; absent: number } | null;
	};

	let loading = $state(true);

	let subjectId = $state(page.params.id!);
	let subject: Subject | undefined = $state();

	let today = new Date();

	let year = $state(today.getFullYear()),
		month = $state(today.getMonth() + 1);
	let days: Array<CalendarCell | null> = $state([]);
	let present = $state(0);
	let absent = $state(0);
	let total = $derived(present + absent);

	const loadSubject = async () => {
		subject = await getSubjectById(subjectId);
		if (!subject) goto('/');
	};

	const loadCalendar = async () => {
		const records = await getAttendanceForMonth(subjectId, year, month);
		const recordMap: Record<string, { present: number; absent: number }> = {};
		records.forEach((r) => (recordMap[r.date] = { present: r.present, absent: r.absent }));

		const daysInMonth = new Date(year, month, 0).getDate();

		const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

		const result: Array<CalendarCell | null> = [];

		for (let i = 0; i < firstDayOfWeek; i++) {
			result.push(null);
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const cell = {
				day,
				date,
				attendance: recordMap[date] ?? null
			};
			result.push(cell);

			if (cell.day === (daySelected ? daySelected.day : today.getDate())) daySelected = cell;
		}

		days = result;

		const attendance = await getAttendance(subjectId);
		present = attendance.present;
		absent = attendance.absent;
	};

	onMount(async () => {
		await loadSubject();
		await loadCalendar();
		await loadTimetableSlots();
		loading = false;
	});

	const loadTimetableSlots = async () => {
		timetableSlots = await getTimetableSlotsForSubject(subjectId);
	};

	function openAddSlotModal() {
		selectedDay = null;
		selectedStartHour = null;
		selectedEndHour = null;
		slotError = '';
		showAddSlotModal = true;
	}

	async function handleAddSlot() {
		if (selectedDay === null || selectedStartHour === null || selectedEndHour === null) {
			slotError = 'Please select day and time';
			return;
		}

		if (selectedEndHour <= selectedStartHour) {
			slotError = 'End time must be after start time';
			return;
		}

		try {
			const hasOverlap = await checkSlotOverlap(selectedDay, selectedStartHour, selectedEndHour);

			if (hasOverlap) {
				slotError = 'This time slot overlaps with another class';
				return;
			}

			await addTimetableSlot(subjectId, selectedDay, selectedStartHour, selectedEndHour);
			await loadTimetableSlots();
			showAddSlotModal = false;
			slotError = '';
		} catch (error) {
			slotError = error instanceof Error ? error.message : 'Failed to add slot';
		}
	}

	function confirmDeleteSlot(slot: TimetableSlot) {
		slotToDelete = slot;
		showDeleteSlotModal = true;
	}

	async function handleDeleteSlot() {
		if (!slotToDelete) return;
		await deleteTimetableSlot(slotToDelete.id);
		await loadTimetableSlots();
		showDeleteSlotModal = false;
		slotToDelete = null;
	}

	function getSlotDisplayText(slot: TimetableSlot): string {
		const day = DAYS_OF_WEEK.find((d) => d.value === slot.dayOfWeek);
		const time = formatTimeSlot(slot.startHour, slot.endHour);
		return `${day?.label}, ${time}`;
	}

	const handleSetAttendance = async (status: 'present' | 'absent', count: number) => {
		if (!daySelected || !subject) return;
		await markAttendance(subjectId, daySelected.date, status, count);
		await loadCalendar();
	};

	const prevMonth = async () => {
		month--;
		if (month === 0) {
			month = 12;
			year--;
		}
		await loadCalendar();
	};
	const nextMonth = async () => {
		month++;
		if (month === 13) {
			month = 1;
			year++;
		}
		await loadCalendar();
	};

	const goBack = () => goto(resolve('/'));

	let showModal = $state(false);

	let daySelected: CalendarCell | null = $state(null);

	// Timetable state
	let timetableSlots: TimetableSlot[] = $state([]);
	let sortedTimeTableSlots = $derived(
		[...timetableSlots].sort((a, b) => {
			if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
			return a.startHour - b.startHour;
		})
	);
	let showAddSlotModal = $state(false);
	let showDeleteSlotModal = $state(false);
	let slotToDelete: TimetableSlot | null = $state(null);

	// Form state for adding slot
	let selectedDay = $state<number | null>(null);
	let selectedStartHour = $state<number | null>(null);
	let selectedEndHour = $state<number | null>(null);
	let slotError = $state('');
</script>

{#if loading}
	<Spinner />
{:else}
	<div class="flex flex-col gap-4">
		<div class="mb-2 flex flex-col gap-4">
			<button
				aria-label="go back"
				class="flex w-fit items-center justify-center rounded-lg bg-(--primary-light) px-2 py-1 text-(--primary)"
				onclick={goBack}
				><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><path fill="currentColor" fill-rule="evenodd" d="m16 5l-8 7l8 7z" /></svg
				>Back</button
			>
			<span class="flex justify-between gap-2"
				><h2 class="max-w-[55%] text-2xl">{subject?.name}</h2>
				<span class="h-fit rounded-lg bg-gray-800 px-2 py-1 text-center text-white"
					>{present}P/{absent}A ({total === 0 ? 0 : Math.round((present / total) * 100)}%)</span
				></span
			>
		</div>

		<div class="flex w-full items-center justify-center gap-5">
			<button aria-label="prev month" class="secondary" onclick={prevMonth}
				><svg
					class="h-4 w-4"
					xmlns="http://www.w3.org/2000/svg"
					width="8"
					height="8"
					viewBox="0 0 8 8"><path fill="currentColor" d="M5 2L3 4l2 2l-1 1l-3-3l3-3" /></svg
				></button
			>
			<span
				>{new Date(year, month - 1).toLocaleString('default', {
					month: 'long',
					year: 'numeric'
				})}</span
			>
			<button aria-label="next month" class="secondary" onclick={nextMonth}
				><svg
					class="h-4 w-4"
					xmlns="http://www.w3.org/2000/svg"
					width="8"
					height="8"
					viewBox="0 0 8 8"><path fill="currentColor" d="m3 2l2 2l-2 2l1 1l3-3l-3-3" /></svg
				></button
			>
		</div>

		<div id="calendar-grid">
			<div class="weekday">Sun</div>
			<div class="weekday">Mon</div>
			<div class="weekday">Tue</div>
			<div class="weekday">Wed</div>
			<div class="weekday">Thu</div>
			<div class="weekday">Fri</div>
			<div class="weekday">Sat</div>
			{#each days as d}
				{#if !d}
					<div class="day-cell blank"></div>
				{:else}
					<AttendanceCell
						day={d.day}
						present={d.attendance?.present}
						absent={d.attendance?.absent}
						onClick={() => (daySelected = d)}
						selected={daySelected != null && daySelected.date === d.date}
					/>
				{/if}
			{/each}
		</div>

		<div class="flex items-center justify-center gap-3">
			<div class="flex h-10 rounded-lg bg-red-500 text-white">
				<button
					disabled={!daySelected || !daySelected.attendance || daySelected.attendance.absent <= 0}
					class="h-full w-6 rounded-l-lg bg-red-600"
					onclick={() => {
						handleSetAttendance('absent', -1);
					}}
				>
					-
				</button>
				<button
					class="h-full rounded-r-lg px-2"
					onclick={() => {
						handleSetAttendance('absent', 1);
					}}
				>
					Absent ({daySelected?.attendance?.absent ?? 0})
				</button>
			</div>
			<div class="flex h-10 rounded-lg bg-green-600 text-white">
				<button
					disabled={!daySelected || !daySelected.attendance || daySelected.attendance.present <= 0}
					class="h-full w-6 rounded-l-lg bg-green-700"
					onclick={() => {
						handleSetAttendance('present', -1);
					}}
				>
					-
				</button>
				<button
					class="h-full rounded-r-lg px-2"
					onclick={() => {
						handleSetAttendance('present', 1);
					}}
				>
					Present ({daySelected?.attendance?.present ?? 0})
				</button>
			</div>
		</div>

		<p class="text-center">
			<button onclick={() => (showModal = true)} class="text-(--primary) underline"
				>Clear All</button
			>
		</p>

		<!-- Timetable Section -->
		<div class="card">
			<div class="mb-3 flex items-center justify-between">
				<h3 class="text-lg font-medium">Timetable</h3>
				<button
					class="rounded-sm bg-(--primary-light) px-3 py-1 text-sm text-(--primary)"
					onclick={openAddSlotModal}>Add Slot</button
				>
			</div>

			{#if timetableSlots.length === 0}
				<p class="text-center text-sm text-gray-600">No timetable slots added yet</p>
			{:else}
				<ul class="space-y-2">
					{#each sortedTimeTableSlots as slot (slot.id)}
						<li class="flex items-center justify-between rounded border border-gray-300 px-3 py-2">
							<span class="text-sm">{getSlotDisplayText(slot)}</span>
							<button
								class="text-sm text-(--danger) underline"
								onclick={() => confirmDeleteSlot(slot)}
							>
								Delete
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<Modal bind:showModal>
		{#snippet confirmButton()}
			<button
				class="danger px-4 py-1"
				onclick={async () => {
					await clearAttendanceForSubject(subjectId);
					await loadCalendar();
					showModal = false;
				}}>Confirm</button
			>
		{/snippet}
		<h1 class="mb-2 text-2xl">{`Clear all attendance data for this subject?`}</h1>

		<p class="mb-2">
			{`This will permanently delete all attendance records for the subject!`}
		</p></Modal
	>

	<!-- Add Timetable Slot Modal -->
	<Modal bind:showModal={showAddSlotModal}>
		{#snippet confirmButton()}
			<button class="bg-(--primary) px-4 py-1 text-white" onclick={handleAddSlot}>Add</button>
		{/snippet}

		<h1 class="mb-4 text-xl">Add Timetable Slot</h1>

		{#if slotError}
			<p class="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{slotError}</p>
		{/if}

		<div class="mb-4 flex flex-col gap-3">
			<div>
				<label for="tt-day" class="mb-1 block text-sm font-medium">Day</label>
				<select
					id="tt-day"
					bind:value={selectedDay}
					class="w-full rounded border border-gray-300 px-3 py-2"
				>
					<option value={null}>Select day...</option>
					{#each DAYS_OF_WEEK as day}
						<option value={day.value}>{day.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="tt-start-hr" class="mb-1 block text-sm font-medium">Start Time</label>
				<select
					id="tt-start-hr"
					bind:value={selectedStartHour}
					class="w-full rounded border border-gray-300 px-3 py-2"
				>
					<option value={null}>Select start...</option>
					{#each TIME_SLOTS as slot}
						<option value={slot.start}>{slot.start}:00</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="tt-end-hr" class="mb-1 block text-sm font-medium">End Time</label>
				<select
					id="tt-end-hr"
					bind:value={selectedEndHour}
					class="w-full rounded border border-gray-300 px-3 py-2"
				>
					<option value={null}>Select end...</option>
					{#each TIME_SLOTS as slot}
						<option value={slot.end}>{slot.end}:00</option>
					{/each}
				</select>
			</div>
		</div>
	</Modal>

	<!-- Delete Slot Confirmation Modal -->
	<Modal bind:showModal={showDeleteSlotModal}>
		{#snippet confirmButton()}
			<button class="danger px-4 py-1" onclick={handleDeleteSlot}>Delete</button>
		{/snippet}

		<h1 class="mb-2 text-xl">Remove Timetable Slot?</h1>
		<p class="mb-4">{slotToDelete ? getSlotDisplayText(slotToDelete) : ''}</p>
	</Modal>
{/if}
