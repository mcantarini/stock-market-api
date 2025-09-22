import { pgTable, serial, varchar, foreignKey, integer, numeric, timestamp, date, bigint, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const instruments = pgTable("instruments", {
	id: serial().primaryKey().notNull(),
	ticker: varchar({ length: 10 }),
	name: varchar({ length: 255 }),
	type: varchar({ length: 10 }),
});

export const orders = pgTable("orders", {
	id: serial().primaryKey().notNull(),
	instrumentid: integer(),
	userid: integer(),
	size: integer(),
	price: numeric({ precision: 10, scale:  2 }),
	type: varchar({ length: 10 }),
	side: varchar({ length: 10 }),
	status: varchar({ length: 20 }),
	datetime: timestamp({ mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.instrumentid],
			foreignColumns: [instruments.id],
			name: "orders_instrumentid_fkey"
		}),
	foreignKey({
			columns: [table.userid],
			foreignColumns: [users.id],
			name: "orders_userid_fkey"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 255 }),
	accountnumber: varchar({ length: 20 }),
});

export const marketdata = pgTable("marketdata", {
	id: serial().primaryKey().notNull(),
	instrumentid: integer(),
	high: numeric({ precision: 10, scale:  2 }),
	low: numeric({ precision: 10, scale:  2 }),
	open: numeric({ precision: 10, scale:  2 }),
	close: numeric({ precision: 10, scale:  2 }),
	previousclose: numeric({ precision: 10, scale:  2 }),
	date: date(),
}, (table) => [
	foreignKey({
			columns: [table.instrumentid],
			foreignColumns: [instruments.id],
			name: "marketdata_instrumentid_fkey"
		}),
]);

export const stockPositions = pgTable("stock_positions", {
	userid: integer(),
	instrumentid: integer(),
	quantity: integer(),
	costbasis: numeric({ precision: 10, scale:  2 }),
	lastorderid: integer(),
	updatedat: timestamp({ mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [users.id],
			name: "positions_userid_fkey"
		}),
	foreignKey({
			columns: [table.instrumentid],
			foreignColumns: [instruments.id],
			name: "positions_instrumentid_fkey"
		}),
	foreignKey({
			columns: [table.lastorderid],
			foreignColumns: [orders.id],
			name: "positions_lastorderid_fkey"
		}),
	primaryKey({ columns: [table.userid, table.instrumentid], name: "positions_pk" }),
]);