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

	interface DayObj {
		day: number;
		date: string;
		status: string | null;
	}

	let subjectId = $state(page.params.id!);
	let subjectName = $state('');

	let today = new Date();

	let year = $state(today.getFullYear()),
		month = $state(today.getMonth() + 1);
	let days: DayObj[] = $state([]);
	let present = $state(0);
	let total = $state(0);

	const loadSubject = async () => {
		const subject = await getSubjectById(subjectId);
		subjectName = subject?.name ?? '';
	};

	const loadCalendar = async () => {
		const records = await getAttendanceForMonth(subjectId, year, month);
		const recordMap: Record<string, string> = {};
		records.forEach((r) => (recordMap[r.date] = r.status));

		const daysInMonth = new Date(year, month, 0).getDate();
		days = Array.from({ length: daysInMonth }, (_, i) => {
			const day = i + 1;
			const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			return { day, date, status: recordMap[date] || null };
		});

		const attendance = await getAttendance(subjectId);
		present = attendance.present;
		total = attendance.total;
	};

	onMount(async () => {
		await loadSubject();
		await loadCalendar();
	});

	const toggleAttendance = async (dayObj: DayObj) => {
		let newStatus = null;
		if (dayObj.status === null) newStatus = 'present';
		else if (dayObj.status === 'present') newStatus = 'absent';
		else if (dayObj.status === 'absent') newStatus = null;

		await markAttendance(subjectId, dayObj.date, newStatus);
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
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-3.5">
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
			<span
				>{present}P/{total - present}A ({total === 0
					? 0
					: Math.round((present / total) * 100)}%)</span
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
		{#each days as d (d)}
			<button
				style={year === today.getFullYear() &&
				month - 1 === today.getMonth() &&
				d.day === today.getDate()
					? 'border: 2px solid blue'
					: 'border: 1px solid black'}
				class="day-cell {d.status === 'present'
					? 'day-present'
					: d.status === 'absent'
						? 'day-absent'
						: ''}"
				onclick={() => toggleAttendance(d)}
			>
				{d.day}
			</button>
		{/each}
	</div>
	<div class="flex justify-end">
		<button
			onclick={() => (showModal = true)}
			class="danger flex w-fit items-center gap-1 rounded-lg px-2 py-1"
			aria-label="clear attendance data"
			>Clear <svg
				class="h-6 w-6"
				xmlns="http://www.w3.org/2000/svg"
				width="512"
				height="512"
				viewBox="0 0 512 512"
				><path
					fill="currentColor"
					d="M258.9 48C141.92 46.42 46.42 141.92 48 258.9c1.56 112.19 92.91 203.54 205.1 205.1c117 1.6 212.48-93.9 210.88-210.88C462.44 140.91 371.09 49.56 258.9 48M429 239.92l-93.08-.1a2 2 0 0 1-1.95-1.57a80.08 80.08 0 0 0-27.44-44.17a2 2 0 0 1-.54-2.43l41.32-83.43a2 2 0 0 1 2.87-.81A176.2 176.2 0 0 1 431 237.71a2 2 0 0 1-2 2.21m-220.8 20.46a48 48 0 1 1 43.42 43.42a48 48 0 0 1-43.42-43.42m-43.55-152.16L206 191.65a2 2 0 0 1-.54 2.43A80.08 80.08 0 0 0 178 238.25a2 2 0 0 1-2 1.57l-93.08.1a2 2 0 0 1-2-2.21a176.2 176.2 0 0 1 80.82-130.3a2 2 0 0 1 2.91.81m-.37 295.34l56.31-74.09a2 2 0 0 1 2.43-.6a79.84 79.84 0 0 0 66 0a2 2 0 0 1 2.43.6l56.31 74.09a2 2 0 0 1-.54 2.92a175.65 175.65 0 0 1-182.36 0a2 2 0 0 1-.58-2.92"
				/></svg
			></button
		>
	</div>
</div>
<Modal
	bind:showModal
	header={`Clear all attendance data for this subject?`}
	description={`This will permanently delete all attendance records for the subject!`}
	handleConfirmation={async () => {
		await clearAttendanceForSubject(subjectId);
		await loadCalendar();
	}}
/>
