# Travel Planning

GlobeTrotter helps people construct, collaborate on, publish, and reuse multi-city travel plans. This glossary defines the language shared by the travel-planning domain.

## Itinerary

**Trip**:
A travel plan owned by one user, covering one travel period and containing stops and itinerary items.
_Avoid_: Itinerary, journey

**Itinerary**:
The ordered stops and scheduled itinerary items that make up the planning content of a trip.
_Avoid_: Trip

**Travel Period**:
The calendar interval from an included start date to an excluded end date. The end date is the departure day, so a one-day period has consecutive start and end dates.
_Avoid_: Inclusive date range

**Catalog City**:
A city available for discovery and selection when planning a stop.
_Avoid_: Stop, destination

**Destination**:
A distinct catalog city included in a trip by at least one stop. Repeated visits to the same city remain one destination.
_Avoid_: Stop

**Stop**:
One planned visit to one catalog city during a trip. A trip may revisit a city in multiple non-overlapping stops.
_Avoid_: Destination, city

**Itinerary Item**:
A scheduled entry within one stop's travel period, such as an activity, transport, stay, meal, note, or other plan.
_Avoid_: Item, event

**Travel Leg**:
A planned movement from one stop to another with its own departure, arrival, transport mode, and estimated cost.
_Avoid_: Transport item, transfer

**Stay**:
An accommodation entry occupying a check-in to checkout span within one stop.
_Avoid_: Hotel night, lodging item

**Planning Gap**:
A visible part of a trip that is not yet covered by a stop, Travel Leg, or Stay where one would normally be expected.
_Avoid_: Validation error, empty day

**Completeness Warning**:
Non-blocking guidance that identifies a Planning Gap or inconsistent schedule while allowing the trip to remain editable and publishable.
_Avoid_: Validation error

**Catalog Activity**:
A reusable suggestion for something to do in one catalog city, including reference duration and cost information.
_Avoid_: Itinerary item

**Sourced Itinerary Item**:
An itinerary item initialized from a catalog activity. Its planning details belong to the trip and may diverge from the catalog activity afterward.
_Avoid_: Catalog activity

**Trip Status**:
A trip is upcoming before its travel period, ongoing during that period, and completed on or after its end date.
_Avoid_: State

## Budget

**Base Currency**:
The single currency in which a trip's budget limit and itinerary-item estimated costs are expressed.
_Avoid_: Activity currency, display currency

**Budget Limit**:
An optional spending ceiling for a trip, expressed in its base currency.
_Avoid_: Estimated cost, budget

**Estimated Cost**:
The planned cost of an itinerary item in the trip's base currency; a trip's estimated total is the sum of these costs.
_Avoid_: Actual cost, price

**Exchange Rate Snapshot**:
The original amount and currency, conversion rate, provider, and effective time retained when an Estimated Cost is converted into a trip's Base Currency.
_Avoid_: Live exchange rate

## Access and reuse

**Trip Owner**:
The user who controls a trip's membership, visibility, share links, base currency, and deletion. The owner is not also a trip member.
_Avoid_: Member, editor

**Trip Member**:
A user explicitly granted viewer or editor access to a trip by its owner.
_Avoid_: Owner, public visitor, collaborator

**Member Trip**:
A trip a user accesses through explicit trip membership rather than ownership, public visibility, or a share link.
_Avoid_: Shared trip, owned trip

**Viewer**:
A trip member who may read the trip but not change it.
_Avoid_: Public visitor

**Editor**:
A trip member who may change trip planning content but not owner-controlled settings.
_Avoid_: Owner

**Trip Participant**:
The trip owner or a trip member. Public and link-based visitors are not participants.
_Avoid_: Public visitor

**Trip Visibility**:
The publication setting that makes a trip private or public. It is independent of membership and share links.
_Avoid_: Permission, member role

**Public Trip**:
A trip published for unauthenticated discovery and reading.
_Avoid_: Link-shared trip, member trip

**Share Link**:
A revocable, optionally expiring link that grants unlisted read access to a trip.
_Avoid_: Membership, public visibility

**Link-Shared Trip**:
A trip read through a valid share link, regardless of whether the trip is public or private.
_Avoid_: Public trip, member trip, shared trip

**Trip Copy**:
A new, independent private trip initialized from another trip's stops and itinerary items. The copier owns it; source membership, share links, and cover image are not carried over.
_Avoid_: Shared trip, live clone, fork

**Saved City**:
A catalog city a user bookmarks for later discovery or planning.
_Avoid_: Destination, stop
