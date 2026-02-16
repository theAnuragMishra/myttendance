import { DAYS_OF_WEEK } from './db';

class AppState {
	newSubject = $state('');
	timetableMode = $state(localStorage.getItem('timetableMode') === 'true');
	selectedDayOffset = $state(0);

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

	selectedDay = $derived.by(() => {
		const today = new Date();
		const targetDate = new Date(today);
		targetDate.setDate(today.getDate() + this.selectedDayOffset);
		return targetDate.getDay();
	});

	selectedDayName = $derived(
		DAYS_OF_WEEK.find((d) => d.value === this.selectedDay)?.label ?? 'Today'
	);
}

export const appState = new AppState();
