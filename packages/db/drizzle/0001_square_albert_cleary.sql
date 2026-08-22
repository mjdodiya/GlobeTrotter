CREATE EXTENSION IF NOT EXISTS "btree_gist";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."itinerary_item_kind" AS ENUM('activity', 'transport', 'stay', 'meal', 'note', 'other');--> statement-breakpoint
CREATE TYPE "public"."trip_member_role" AS ENUM('viewer', 'editor');--> statement-breakpoint
CREATE TYPE "public"."trip_visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"city_id" bigint NOT NULL,
	"category_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_duration_minutes" integer,
	"estimated_cost" numeric(18, 4),
	"currency" char(3),
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_categories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "activity_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"country_code" char(2) NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"timezone" text NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"cost_index" numeric(8, 2),
	"description" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"code" char(2) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "countries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "itinerary_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_stop_id" uuid NOT NULL,
	"source_activity_id" bigint,
	"kind" "itinerary_item_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_date" date NOT NULL,
	"start_time" time(0),
	"duration_minutes" integer,
	"estimated_cost" numeric(18, 4) NOT NULL,
	"position" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itinerary_items_estimated_cost_check" CHECK ("itinerary_items"."estimated_cost" >= 0),
	CONSTRAINT "itinerary_items_position_check" CHECK ("itinerary_items"."position" >= 0),
	CONSTRAINT "itinerary_items_duration_minutes_check" CHECK ("itinerary_items"."duration_minutes" is null or "itinerary_items"."duration_minutes" > 0),
	CONSTRAINT "itinerary_items_source_activity_kind_check" CHECK ("itinerary_items"."source_activity_id" is null or "itinerary_items"."kind" = 'activity')
);
--> statement-breakpoint
CREATE TABLE "saved_cities" (
	"user_id" text NOT NULL,
	"city_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_cities_user_id_city_id_pk" PRIMARY KEY("user_id","city_id")
);
--> statement-breakpoint
CREATE TABLE "trip_members" (
	"trip_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "trip_member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_members_trip_id_user_id_pk" PRIMARY KEY("trip_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "trip_share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_share_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "trip_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"city_id" bigint NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"position" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_stops_date_range_check" CHECK ("trip_stops"."end_date" > "trip_stops"."start_date"),
	CONSTRAINT "trip_stops_position_check" CHECK ("trip_stops"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_image_key" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"budget_limit" numeric(18, 4),
	"base_currency" char(3) NOT NULL,
	"visibility" "trip_visibility" DEFAULT 'private' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"copied_from_trip_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_date_range_check" CHECK ("trips"."end_date" > "trips"."start_date"),
	CONSTRAINT "trips_budget_limit_check" CHECK ("trips"."budget_limit" is null or "trips"."budget_limit" >= 0),
	CONSTRAINT "trips_version_check" CHECK ("trips"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_category_id_activity_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."activity_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_trip_stop_id_trip_stops_id_fk" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_source_activity_id_activities_id_fk" FOREIGN KEY ("source_activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_cities" ADD CONSTRAINT "saved_cities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_cities" ADD CONSTRAINT "saved_cities_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_share_links" ADD CONSTRAINT "trip_share_links_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_share_links" ADD CONSTRAINT "trip_share_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_copied_from_trip_id_trips_id_fk" FOREIGN KEY ("copied_from_trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_city_category_cost_idx" ON "activities" USING btree ("city_id","category_id","estimated_cost");--> statement-breakpoint
CREATE INDEX "activities_name_trgm_idx" ON "activities" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "cities_name_trgm_idx" ON "cities" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "itinerary_stop_schedule_idx" ON "itinerary_items" USING btree ("trip_stop_id","scheduled_date","start_time","position");--> statement-breakpoint
CREATE INDEX "itinerary_source_activity_idx" ON "itinerary_items" USING btree ("source_activity_id");--> statement-breakpoint
CREATE INDEX "trip_members_user_idx" ON "trip_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trip_share_links_trip_idx" ON "trip_share_links" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_stops_trip_position_idx" ON "trip_stops" USING btree ("trip_id","position");--> statement-breakpoint
CREATE INDEX "trip_stops_city_idx" ON "trip_stops" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "trips_owner_start_date_idx" ON "trips" USING btree ("owner_id","start_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "public_trips_created_idx" ON "trips" USING btree ("created_at" DESC NULLS LAST) WHERE "trips"."visibility" = 'public';--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_no_overlapping_dates_excl" EXCLUDE USING gist (
	"trip_id" WITH =,
	daterange("start_date", "end_date", '[)') WITH &&
);
