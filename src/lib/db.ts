import { Dexie, type EntityTable } from 'dexie';

export interface Subject {
	id: string;
	name: string;
	createdAt: number;
}

export interface SubjectWithAttendance extends Subject {
	present: number;
	absent: number;
	total: number;
	daysToGreen: number;
	timetableSlots?: TimetableSlot[];
}

export interface Attendance {
	id: string;
	subjectId: string;
	date: string;
	present: number;
	absent: number;
}

export interface TimetableSlot {
	id: string;
	subjectId: string;
	dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
	startHour: number; // 6-19 (24-hour format)
	endHour: number; // 6-19 (24-hour format)
}

export const TIME_SLOTS = [
	{ start: 6, end: 7 },
	{ start: 7, end: 8 },
	{ start: 8, end: 9 },
	{ start: 9, end: 10 },
	{ start: 10, end: 11 },
	{ start: 11, end: 12 },
	{ start: 12, end: 13 },
	{ start: 13, end: 14 },
	{ start: 14, end: 15 },
	{ start: 15, end: 16 },
	{ start: 16, end: 17 },
	{ start: 17, end: 18 },
	{ start: 18, end: 19 }
];

export const DAYS_OF_WEEK = [
	{ value: 0, label: 'Sunday' },
	{ value: 1, label: 'Monday' },
	{ value: 2, label: 'Tuesday' },
	{ value: 3, label: 'Wednesday' },
	{ value: 4, label: 'Thursday' },
	{ value: 5, label: 'Friday' },
	{ value: 6, label: 'Saturday' }
];

export const db = new Dexie('attendanceDB') as Dexie & {
	subjects: EntityTable<Subject, 'id'>;
	attendance: EntityTable<Attendance, 'id'>;
	timetableSlots: EntityTable<TimetableSlot, 'id'>;
};

db.version(1).stores({
	subjects: 'id, name, createdAt',
	attendance: 'id, [subjectId+date], subjectId, date, status'
});

db.version(2)
	.stores({
		subjects: 'id, name, createdAt',
		attendance: 'id, [subjectId+date], subjectId, date'
	})
	.upgrade(async (tx) => {
		await tx
			.table('attendance')
			.toCollection()
			.modify((rec) => {
				const status = rec.status;

				rec.present = status === 'present' ? 1 : 0;
				rec.absent = status === 'absent' ? 1 : 0;

				delete rec.status;
			});
	});

db.version(3).stores({
	subjects: 'id, name, createdAt',
	attendance: 'id, [subjectId+date], subjectId, date',
	timetableSlots: 'id, subjectId, [subjectId+dayOfWeek], [dayOfWeek+startHour]'
});

export const uuid = () => crypto.randomUUID();

export const calculateDaysToGreen = (
	present: number,
	absent: number,
	targetPercent = 75
): number => {
	const total = present + absent;
	if (total === 0) return 0;

	const currentPercent = (present / total) * 100;
	if (currentPercent >= targetPercent) return 0;

	const daysNeeded = Math.ceil((targetPercent * total - present * 100) / (100 - targetPercent));
	return Math.max(0, daysNeeded);
};

export const formatTimeSlot = (startHour: number, endHour: number): string => {
	return `${startHour}-${endHour}`;
};

export const getTodaysSlots = (slots: TimetableSlot[]): TimetableSlot[] => {
	const today = new Date().getDay();
	return slots.filter((slot) => slot.dayOfWeek === today);
};

export const getTodaysTimeString = (slots: TimetableSlot[]): string => {
	const todaysSlots = getTodaysSlots(slots);
	if (!todaysSlots.length) return '';
	return todaysSlots
		.sort((a, b) => a.startHour - b.startHour)
		.map((s) => formatTimeSlot(s.startHour, s.endHour))
		.join(', ');
};

export const getTimeSlotsForDay = (slots: TimetableSlot[], dayOfWeek: number): string => {
	const daySlots = slots.filter((slot) => slot.dayOfWeek === dayOfWeek);
	if (!daySlots.length) return '';
	return daySlots
		.sort((a, b) => a.startHour - b.startHour)
		.map((s) => formatTimeSlot(s.startHour, s.endHour))
		.join(', ');
};

export const checkSlotOverlap = async (
	dayOfWeek: number,
	startHour: number,
	endHour: number,
	excludeSlotId?: string
): Promise<boolean> => {
	const allSlots = await db.timetableSlots.where('dayOfWeek').equals(dayOfWeek).toArray();

	return allSlots.some((slot) => {
		if (slot.id === excludeSlotId) return false;
		// Two ranges overlap if: start1 < end2 AND end1 > start2
		return startHour < slot.endHour && endHour > slot.startHour;
	});
};

export const addTimetableSlot = async (
	subjectId: string,
	dayOfWeek: number,
	startHour: number,
	endHour: number
): Promise<TimetableSlot> => {
	const hasOverlap = await checkSlotOverlap(dayOfWeek, startHour, endHour);
	if (hasOverlap) {
		throw new Error('Time slot overlaps with an existing class');
	}

	const slot: TimetableSlot = {
		id: uuid(),
		subjectId,
		dayOfWeek,
		startHour,
		endHour
	};

	await db.timetableSlots.add(slot);
	return slot;
};

export const getTimetableSlotsForSubject = async (subjectId: string): Promise<TimetableSlot[]> => {
	return db.timetableSlots.where('subjectId').equals(subjectId).toArray();
};

export const deleteTimetableSlot = async (id: string): Promise<void> => {
	await db.timetableSlots.delete(id);
};

export const getTodaysSubjectIds = async (): Promise<string[]> => {
	const today = new Date().getDay();
	const todaysSlots = await db.timetableSlots.where('dayOfWeek').equals(today).toArray();

	return [...new Set(todaysSlots.map((s) => s.subjectId))];
};

export const addSubject = async (name: string) => {
	const subject = { id: uuid(), name, createdAt: Date.now() };
	await db.subjects.add(subject);
	return subject;
};

export const deleteSubject = async (subjectId: string) => {
	return db.transaction('rw', db.subjects, db.attendance, db.timetableSlots, async () => {
		await db.subjects.delete(subjectId);

		await db.attendance.where('subjectId').equals(subjectId).delete();

		await db.timetableSlots.where('subjectId').equals(subjectId).delete();
	});
};

export const renameSubject = async (id: string, newName: string) => {
	if (!newName.trim()) return;

	await db.subjects.update(id, {
		name: newName.trim()
	});
};

export const getSubjectById = (id: string) => {
	return db.subjects.get(id);
};

export const getAllSubjects = async (
	includeTimetable = false
): Promise<SubjectWithAttendance[]> => {
	const subjects = await db.subjects.orderBy('createdAt').reverse().toArray();

	const subjectsWithAttendance = await Promise.all(
		subjects.map(async (s) => {
			const { present, absent } = await getAttendance(s.id);
			const total = present + absent;

			const result: SubjectWithAttendance = {
				...s,
				present,
				absent,
				total,
				daysToGreen: calculateDaysToGreen(present, absent)
			};

			if (includeTimetable) {
				result.timetableSlots = await getTimetableSlotsForSubject(s.id);
			}

			return result;
		})
	);

	return subjectsWithAttendance;
};

export const markAttendance = async (
	subjectId: string,
	date: string,
	status: 'present' | 'absent',
	count: number
) => {
	const subject = await getSubjectById(subjectId);
	if (!subject) return;

	const existing = await db.attendance.where({ subjectId, date }).first();

	if (existing) {
		let { present, absent } = existing;
		if (status === 'present') {
			present += count;
		} else if (status === 'absent') {
			absent += count;
		}

		present = Math.max(0, present);
		absent = Math.max(0, absent);

		if (present === 0 && absent === 0) {
			await db.attendance.delete(existing.id);
		} else
			await db.attendance.update(existing.id, {
				present,
				absent
			});
	} else {
		await db.attendance.add({
			id: uuid(),
			subjectId,
			date,
			present: status === 'present' ? count : 0,
			absent: status === 'absent' ? count : 0
		});
	}
};

export const getAttendanceForMonth = (subjectId: string, year: number, month: number) => {
	const start = `${year}-${String(month).padStart(2, '0')}-01`;
	const daysInMonth = new Date(year, month, 0).getDate();
	const end = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
	return db.attendance
		.where('[subjectId+date]')
		.between([subjectId, start], [subjectId, end], true, true)
		.toArray();
};

export const getAttendance = async (subjectId: string) => {
	const records = await db.attendance.where('subjectId').equals(subjectId).toArray();

	if (records.length === 0) {
		return { present: 0, absent: 0 };
	}

	let totalPresent = 0;
	let totalAbsent = 0;

	for (const r of records) {
		totalPresent += r.present;
		totalAbsent += r.absent;
	}

	return {
		present: totalPresent,
		absent: totalAbsent
	};
};

export const clearAttendanceForSubject = async (subjectId: string) => {
	await db.attendance.where('subjectId').equals(subjectId).delete();
};

export const clearAllData = () =>
	Promise.all(Object.values(db.tables).map((table) => table.clear()));
