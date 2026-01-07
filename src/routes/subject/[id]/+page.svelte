<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getAttendanceForMonth,
		markAttendance,
		getAttendance,
		getSubjectById,
		clearAttendanceForSubject
	} from '$lib/db';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Modal from '$lib/components/Modal.svelte';
	import AttendanceCell from '$lib/components/AttendanceCell.svelte';

	type CalendarCell = {
		day: number;
		date: string;
		attendance: { present: number; absent: number } | null;
	};

	let subjectId = $state(page.params.id!);
	let subjectName = $state('');

	let today = new Date();

	let year = $state(today.getFullYear()),
		month = $state(today.getMonth() + 1);
	let days: Array<CalendarCell | null> = $state([]);
	let present = $state(0);
	let absent = $state(0);
	let total = $derived(present + absent);

	const loadSubject = async () => {
		const subject = await getSubjectById(subjectId);
		subjectName = subject?.name ?? '';
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
	});

	const handleSetAttendance = async (status: 'present' | 'absent', count: number) => {
		if (!daySelected) return;
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
</script>

<div class="flex flex-col gap-4">
	<div class="mb-2 flex flex-col gap-3.5">
		<button
			aria-label="go back"
			class="secondary flex w-fit items-center justify-center"
			onclick={goBack}
			><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
				><path fill="currentColor" fill-rule="evenodd" d="m16 5l-8 7l8 7z" /></svg
			>Back</button
		>
		<span class="flex justify-between"
			><h2 class="text-2xl">{subjectName}</h2>
			<span class="flex items-center gap-1"
				><span class="rounded-lg bg-gray-800 px-2 py-1 text-white"
					>{present}P/{absent}A ({total === 0 ? 0 : Math.round((present / total) * 100)}%)</span
				><button
					onclick={() => (showModal = true)}
					class="danger flex h-full w-fit items-center gap-1 rounded-lg px-2 py-1"
					aria-label="clear attendance data">Clear</button
				></span
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
