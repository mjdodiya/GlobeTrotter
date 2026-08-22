# Snapshot currency conversions in travel plans

When a catalog or Travel Leg cost is converted into a Trip's Base Currency, GlobeTrotter stores the original money, applied rate, provider, and effective time alongside the Estimated Cost. Existing plans never change when market rates move; refreshing rates is an explicit previewed trip mutation, trading live totals for reproducibility and protection from surprising budget changes.
