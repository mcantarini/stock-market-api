CREATE TABLE "stock_positions" (
	"userid" integer,
	"instrumentid" integer,
	"quantity" integer,
	"costbasis" numeric(10, 2),
	"lastorderid" integer,
	"updatedat" timestamp,
	CONSTRAINT "positions_pk" PRIMARY KEY("userid","instrumentid")
);
--> statement-breakpoint
ALTER TABLE "stock_positions" ADD CONSTRAINT "positions_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_positions" ADD CONSTRAINT "positions_instrumentid_fkey" FOREIGN KEY ("instrumentid") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_positions" ADD CONSTRAINT "positions_lastorderid_fkey" FOREIGN KEY ("lastorderid") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;