# Use local time and half-open travel periods

GlobeTrotter represents trip and stop periods as local calendar intervals with an included start date and excluded end date, while itinerary times are interpreted in the stop city's time zone. Travel Legs retain absolute departure and arrival instants plus their original IANA time zones so international date changes and daylight-saving transitions remain unambiguous; this is more explicit than treating every trip as UTC or attaching a single time zone to a multi-city trip.
