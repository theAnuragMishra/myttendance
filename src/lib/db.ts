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
}

export interface Attendance {
	id: string;
	subjectId: string;
	date: string;
	present: number;
	absent: number;
}

export const db = new Dexie('attendanceDB') as Dexie & {
	subjects: EntityTable<Subject, 'id'>;
	attendance: EntityTable<Attendance, 'id'>;
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

export const uuid = () => crypto.randomUUID();

export const addSubject = async (name: string) => {
	const subject = { id: uuid(), name, createdAt: Date.now() };
	await db.subjects.add(subject);
	return subject;
};

export const deleteSubject = async (subjectId: string) => {
	return db.transaction('rw', db.subjects, db.attendance, async () => {
		await db.subjects.delete(subjectId);

		await db.attendance.where('subjectId').equals(subjectId).delete();
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

export const getAllSubjects = async (): Promise<SubjectWithAttendance[]> => {
	const subjects = await db.subjects.orderBy('createdAt').reverse().toArray();

	const subjectsWithAttendance = await Promise.all(
		subjects.map(async (s) => {
			const { present, absent } = await getAttendance(s.id);

			return {
				...s,
				present,
				absent,
				total: present + absent
			};
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
