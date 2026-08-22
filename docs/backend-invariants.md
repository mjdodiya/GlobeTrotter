# Backend invariants

These rules define which states the GlobeTrotter backend accepts. The API enforces cross-record rules and returns domain-specific problem details; PostgreSQL independently enforces the constraints it can express locally.

## Time and scheduling

- Trip, Stop, and Stay periods are half-open: the start date is included and the end/checkout date is excluded. A one-night Stay from January 1 to January 2 occupies the night of January 1.
- A Trip and every Stop have a positive duration. A Stop must be contained within its Trip and must not overlap another Stop in that Trip.
- An Itinerary Item's scheduled date must be inside its Stop. Only a Stay may have checkout fields; a Stay must check out after check-in and may check out on, but never after, the Stop end date.
- A Travel Leg belongs to exactly one Trip, references two distinct Stops in that same Trip, and arrives after departure as an absolute instant. Its departure and arrival IANA time zones are snapshots of the endpoint cities.
- Only one directional Travel Leg may connect the same ordered Stop pair. Reversing the direction is a different pair.
- Reordering is a complete permutation. Stop duration follows the Stop, while the gaps between route positions are preserved. Itinerary Item dates shift by the same offset as their Stop.
- Reordering never silently retargets a Travel Leg. The preview reports every leg whose endpoints cease to be adjacent, and commit succeeds only when the caller explicitly supplies that exact set for removal.

Impossible chronology, containment failures, and broken references are hard errors. A partially planned trip is valid: uncovered days, accommodation gaps, missing Travel Legs, and legs whose local departure/arrival date looks inconsistent are returned as non-blocking Completeness Warnings.

## Money and budgets

- A Trip has one Base Currency. Its Budget Limit, Itinerary Item Estimated Costs, and Travel Leg Estimated Costs are non-negative decimal amounts at four-decimal precision.
- Once planning costs exist, changing Base Currency is rejected. This prevents existing numbers from being relabeled as a different currency.
- An automatic conversion stores the original amount/currency, rate, provider, and effective timestamp with the converted Estimated Cost. Editing the converted cost manually clears that snapshot.
- Stored estimates never move with the market. `rates/preview` calculates proposed snapshots without writing; `rates/refresh` commits them only through the Trip ETag boundary.
- Budget totals include Itinerary Items and Travel Legs. Stay estimates are distributed across occupied nights; indivisible four-decimal remainders go to the earliest nights, so daily allocations always sum exactly to the stored estimate.
- All totals within one response have the Trip Base Currency. Dashboard aggregates remain separated by currency and are never added across currencies.

## Concurrency and access

- Trip is the aggregate concurrency boundary. Every shared-planning mutation locks the Trip, validates a quoted `If-Match` version, applies the write transactionally, and increments the version once.
- A stale version returns `412 STALE_TRIP_VERSION`; a missing precondition returns `428 PRECONDITION_REQUIRED`. A rejected transaction does not consume a version.
- The Trip Owner is not duplicated in membership. Owners manage membership, Share Links, visibility, Base Currency, and deletion. Editors may change planning content; viewers may only read it.
- A Trip Member may remove their own membership without an ETag because leaving changes only that user's access, not shared planning content. Owners cannot leave their own Trip.
- Direct membership and public publication require a verified account. Share Links are read-only, revocable, optionally expiring capabilities and do not create membership.
- A Trip Copy is a new, private, independently versioned aggregate. It copies planning snapshots and notes but not membership, Share Links, publication, owner, or cover image.

## Privacy and account lifecycle

- Authenticated participant projections may contain private notes and Budget Limits. Public and Share Link projections are built from an allowlist and omit Stop, Item, and Travel Leg notes plus the Budget Limit.
- Account JSON export includes the account profile, preferences, Saved Cities, owned Trip aggregates, and membership metadata. It does not export credential hashes, session tokens, verification records, or Share Link token hashes.
- Calendar export includes scheduled entries from owned and member Trips. Timed Itinerary Items use the Stop's IANA time zone; Travel Legs use UTC instants; all-day end dates remain exclusive.
- Deleting an account is email-confirmed by the authentication boundary. The deletion-impact endpoint reports owned aggregates and related records before deletion. Database cascades remove owned Trips and their planning data, the user's memberships, Saved Cities, preferences, sessions, and account records.

## Catalog and persistence

- Catalog City identity is the country/name pair. Catalog Activity identity is the city/name pair, making the curated seed repeatable.
- A sourced Itinerary Item must remain kind `activity` and its Catalog Activity must belong to the Stop city. It snapshots planning fields, so later catalog edits do not rewrite an existing Trip.
- Foreign keys, check constraints, unique indexes, and cascading deletes are the last line of defense. API code must not disable them to perform route changes; multi-row rewrites use valid temporary positions and periods before applying their final values.
