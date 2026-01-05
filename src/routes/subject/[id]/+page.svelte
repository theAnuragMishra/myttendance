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
	let year = $state(new Date().getFullYear()),
		month = $state(new Date().getMonth() + 1);
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
		<button class="secondary w-fit" onclick={goBack}>← Back</button>
		<span class="flex justify-between"
			><h2 class="text-2xl">{subjectName}</h2>
			<span>{present}P/{total - present}A ({Math.round((present / total) * 100)}%)</span></span
		>
	</div>

	<div class="flex w-full items-center justify-center gap-5">
		<button class="secondary" onclick={prevMonth}>←</button>
		<span
			>{new Date(year, month - 1).toLocaleString('default', {
				month: 'long',
				year: 'numeric'
			})}</span
		>
		<button class="secondary" onclick={nextMonth}>→</button>
	</div>

	<div id="calendar-grid">
		{#each days as d (d)}
			<button
				style={d.day === new Date().getDate()
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
