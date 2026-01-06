<script lang="ts">
	import { onMount } from 'svelte';
	import { getAttendanceForMonth, markAttendance, getAttendance, getAllSubjects } from '$lib/db';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

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
		const s = await getAllSubjects();
		subjectName = s.find((sub) => sub.id === subjectId)?.name || '';
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
</div>
