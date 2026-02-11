import { DAYS_OF_WEEK, getAllSubjects, type SubjectWithAttendance } from './db';

class AppState {
	subjects: Array<SubjectWithAttendance> = $state([]);

	newSubject = $state('');

	loadSubjects = async () => {
		this.subjects = await getAllSubjects(true);
	};

	initialize = async () => {
		this.loadSubjects();
		this.loading = false;
	};

	toggleTimetableMode = () => {
		this.timetableMode = !this.timetableMode;
		localStorage.setItem('timetableMode', String(this.timetableMode));
	};

	goToPreviousDay = () => {
		this.selectedDayOffset--;
	};

	goToNextDay = () => {
		this.selectedDayOffset++;
	};

	goToToday = () => {
		this.selectedDayOffset = 0;
	};

	loading = $state(true);

	//sort features

	sortStrategyAll = $state(localStorage.getItem('sortStrategyAll') ?? 'newest');
	sortStrategyToday = $state(localStorage.getItem('sortStrategyToday') ?? 'timetable');
	timetableMode = $state(localStorage.getItem('timetableMode') === 'true');
	selectedDayOffset = $state(0);

	sortSubjects = (strategy: string, subs: Array<SubjectWithAttendance>) => {
		//console.log(strategy);
		const sorted = [...subs];
		if (!strategy || strategy === 'name') {
			sorted.sort((a, b) => a.name.localeCompare(b.name));
		} else if (strategy === 'newest') {
			sorted.sort((a, b) => b.createdAt - a.createdAt);
		} else if (strategy === 'attendance_low') {
			sorted.sort((a, b) => {
				const pa = a.total == 0 ? 0 : Math.round((a.present / a.total) * 100);
				const pb = b.total == 0 ? 0 : Math.round((b.present / b.total) * 100);

				if (pa != pb) return pa - pb;
				// i first wrote the next line in flow but suddenly realised it's redundant. what a gotcha!
				// if (a.present != b.present) return a.present - b.present;
				return b.absent - a.absent;
			});
		} else if (strategy === 'timetable') {
			// Sort by earliest time slot for the selected day
			sorted.sort((a, b) => {
				const aSlotsToday =
					a.timetableSlots?.filter((slot) => slot.dayOfWeek === this.selectedDay) ?? [];
				const bSlotsToday =
					b.timetableSlots?.filter((slot) => slot.dayOfWeek === this.selectedDay) ?? [];

				if (aSlotsToday.length === 0 && bSlotsToday.length === 0) return 0;
				if (aSlotsToday.length === 0) return 1;
				if (bSlotsToday.length === 0) return -1;

				const aEarliest = Math.min(...aSlotsToday.map((s) => s.startHour));
				const bEarliest = Math.min(...bSlotsToday.map((s) => s.startHour));

				return aEarliest - bEarliest;
			});
		} else {
			sorted.sort((a, b) => {
				const pa = a.total == 0 ? 0 : Math.round((a.present / a.total) * 100);
				const pb = b.total == 0 ? 0 : Math.round((b.present / b.total) * 100);
				if (pa != pb) return pb - pa;
				// if (a.present != b.present) return a.present - b.present;
				return a.absent - b.absent;
			});
		}
		return sorted;
	};

	sortedSubjects: Array<SubjectWithAttendance> = $derived.by(() =>
		this.sortSubjects(this.sortStrategy, appState.subjects)
	);

	selectedDayName = $derived(
		DAYS_OF_WEEK.find((d) => d.value === this.selectedDay)?.label ?? 'Today'
	);
	filteredSubjects: Array<SubjectWithAttendance> = $derived.by(() => {
		let filtered = this.sortedSubjects;

		if (appState.timetableMode) {
			filtered = filtered.filter((subject) => {
				const todaysSlots =
					subject.timetableSlots?.filter((slot) => slot.dayOfWeek === this.selectedDay) ?? [];
				return todaysSlots.length > 0;
			});
		}

		return filtered;
	});
	sortOptions = $derived.by(() => {
		const baseOptions = [
			{ type: 'name', value: 'Name' },
			{ type: 'newest', value: 'Newest Date First' },
			{ type: 'attendance_low', value: 'Lowest Attendance First' },
			{ type: 'attendance_high', value: 'Highest Attendance First' }
		];

		if (appState.timetableMode) {
			baseOptions.push({ type: 'timetable', value: 'Timetable Order' });
		}

		return baseOptions;
	});
	sortStrategy = $derived(this.timetableMode ? this.sortStrategyToday : this.sortStrategyAll);
	selectedDay = $derived.by(() => {
		const today = new Date();
		const targetDate = new Date(today);
		targetDate.setDate(today.getDate() + this.selectedDayOffset);
		return targetDate.getDay();
	});
}

export const appState = new AppState();
