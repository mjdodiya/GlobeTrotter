CREATE TYPE "public"."trip_leg_mode" AS ENUM('flight', 'train', 'bus', 'car', 'ferry', 'walk', 'other');--> statement-breakpoint
CREATE TABLE "trip_legs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"from_stop_id" uuid NOT NULL,
	"to_stop_id" uuid NOT NULL,
	"mode" "trip_leg_mode" NOT NULL,
	"title" text NOT NULL,
	"provider" text,
	"reference" text,
	"departure_at" timestamp with time zone NOT NULL,
	"arrival_at" timestamp with time zone NOT NULL,
	"departure_timezone" text NOT NULL,
	"arrival_timezone" text NOT NULL,
	"estimated_cost" numeric(18, 4) NOT NULL,
	"original_cost" numeric(18, 4),
	"original_currency" char(3),
	"exchange_rate" numeric(24, 12),
	"exchange_rate_provider" text,
	"exchange_rate_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_legs_distinct_stops_check" CHECK ("trip_legs"."from_stop_id" <> "trip_legs"."to_stop_id"),
	CONSTRAINT "trip_legs_time_range_check" CHECK ("trip_legs"."arrival_at" > "trip_legs"."departure_at"),
	CONSTRAINT "trip_legs_estimated_cost_check" CHECK ("trip_legs"."estimated_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_travel_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"default_currency" char(3) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "end_time" time(0);--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "original_cost" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "original_currency" char(3);--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "exchange_rate" numeric(24, 12);--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "exchange_rate_provider" text;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "exchange_rate_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_stops_trip_id_id_uidx" ON "trip_stops" USING btree ("trip_id","id");--> statement-breakpoint
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_from_stop_fk" FOREIGN KEY ("trip_id","from_stop_id") REFERENCES "public"."trip_stops"("trip_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_to_stop_fk" FOREIGN KEY ("trip_id","to_stop_id") REFERENCES "public"."trip_stops"("trip_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_travel_preferences" ADD CONSTRAINT "user_travel_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_legs_trip_departure_idx" ON "trip_legs" USING btree ("trip_id","departure_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_legs_trip_stops_uidx" ON "trip_legs" USING btree ("trip_id","from_stop_id","to_stop_id");--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_end_date_check" CHECK ("itinerary_items"."end_date" is null or "itinerary_items"."end_date" >= "itinerary_items"."scheduled_date");
