import { Dexie, type EntityTable } from 'dexie';

export interface Subject {
	id: string;
	name: string;
	createdAt: number;
}

export interface Attendance {
	id: string;
	subjectId: string;
	date: string;
	status: string;
}

export const db = new Dexie('attendanceDB') as Dexie & {
	subjects: EntityTable<Subject, 'id'>;
	attendance: EntityTable<Attendance, 'id'>;
};

db.version(1).stores({
	subjects: 'id, name, createdAt',
	attendance: 'id, [subjectId+date], subjectId, date, status'
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

export const getAllSubjects = () => db.subjects.orderBy('createdAt').toArray();

export const markAttendance = async (subjectId: string, date: string, status: string | null) => {
	const existing = await db.attendance.where({ subjectId, date }).first();
	if (existing) {
		if (status === null) await db.attendance.delete(existing.id);
		else await db.attendance.update(existing.id, { status });
	} else if (status !== null) {
		await db.attendance.add({ id: uuid(), subjectId, date, status });
	}
};

export const getAttendanceForMonth = (subjectId: string, year: number, month: number) => {
	const start = `${year}-${String(month).padStart(2, '0')}-01`;
	const end = `${year}-${String(month).padStart(2, '0')}-31`;
	return db.attendance
		.where('[subjectId+date]')
		.between([subjectId, start], [subjectId, end])
		.toArray();
};

export const getAttendance = async (subjectId: string) => {
	const records = await db.attendance.where('subjectId').equals(subjectId).toArray();
	if (records.length === 0) return { present: 0, total: 0 };
	const present = records.filter((r) => r.status === 'present').length;
	return { present, total: records.length };
};
