import { pgTable, index, foreignKey, unique, varchar, timestamp, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const bookings = pgTable("bookings", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	bookingNo: varchar("booking_no", { length: 30 }).notNull(),
	studentName: varchar("student_name", { length: 50 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	requirement: varchar({ length: 500 }),
	teacher: varchar({ length: 50 }).notNull(),
	date: varchar({ length: 10 }).notNull(),
	timeSlot: varchar("time_slot", { length: 20 }).notNull(),
	timeslotId: varchar("timeslot_id", { length: 20 }).notNull(),
	status: varchar({ length: 20 }).default('confirmed').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("bookings_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
	index("bookings_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("bookings_timeslot_id_idx").using("btree", table.timeslotId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.timeslotId],
			foreignColumns: [timeslots.id],
			name: "bookings_timeslot_id_timeslots_id_fk"
		}),
	unique("bookings_booking_no_unique").on(table.bookingNo),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const timeslots = pgTable("timeslots", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	date: varchar({ length: 10 }).notNull(),
	startTime: varchar("start_time", { length: 5 }).notNull(),
	endTime: varchar("end_time", { length: 5 }).notNull(),
	teacher: varchar({ length: 50 }).notNull(),
	maxParticipants: varchar("max_participants", { length: 10 }).default('1').notNull(),
	status: varchar({ length: 20 }).default('available').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("timeslots_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
	index("timeslots_date_status_idx").using("btree", table.date.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("timeslots_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);
