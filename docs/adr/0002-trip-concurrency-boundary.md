# Use Trip as the planning concurrency boundary

Trip remains the concurrency boundary for planning mutations: the API locks the Trip, checks `If-Match`, applies invariant-preserving changes transactionally, and increments its version. A Trip Member leaving is an intentional exception because it changes the member's own access rather than shared planning content; leaving is idempotent, requires no trip version, and causes other cached participant views to be invalidated.
