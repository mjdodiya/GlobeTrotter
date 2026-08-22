ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_stay_span_check" CHECK (("itinerary_items"."kind" = 'stay' and "itinerary_items"."end_date" is not null) or
          ("itinerary_items"."kind" <> 'stay' and "itinerary_items"."end_date" is null and "itinerary_items"."end_time" is null));--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_conversion_snapshot_check" CHECK ((
        "itinerary_items"."original_cost" is null and "itinerary_items"."original_currency" is null and
        "itinerary_items"."exchange_rate" is null and "itinerary_items"."exchange_rate_provider" is null and
        "itinerary_items"."exchange_rate_at" is null
      ) or (
        "itinerary_items"."original_cost" is not null and "itinerary_items"."original_cost" >= 0 and
        "itinerary_items"."original_currency" is not null and "itinerary_items"."exchange_rate" is not null and
        "itinerary_items"."exchange_rate" > 0 and "itinerary_items"."exchange_rate_provider" is not null and
        "itinerary_items"."exchange_rate_at" is not null
      ));--> statement-breakpoint
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_conversion_snapshot_check" CHECK ((
        "trip_legs"."original_cost" is null and "trip_legs"."original_currency" is null and
        "trip_legs"."exchange_rate" is null and "trip_legs"."exchange_rate_provider" is null and
        "trip_legs"."exchange_rate_at" is null
      ) or (
        "trip_legs"."original_cost" is not null and "trip_legs"."original_cost" >= 0 and
        "trip_legs"."original_currency" is not null and "trip_legs"."exchange_rate" is not null and
        "trip_legs"."exchange_rate" > 0 and "trip_legs"."exchange_rate_provider" is not null and
        "trip_legs"."exchange_rate_at" is not null
      ));
