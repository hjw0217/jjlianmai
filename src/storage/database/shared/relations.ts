import { relations } from "drizzle-orm/relations";
import { timeslots, bookings } from "./schema";

export const bookingsRelations = relations(bookings, ({one}) => ({
	timeslot: one(timeslots, {
		fields: [bookings.timeslotId],
		references: [timeslots.id]
	}),
}));

export const timeslotsRelations = relations(timeslots, ({many}) => ({
	bookings: many(bookings),
}));