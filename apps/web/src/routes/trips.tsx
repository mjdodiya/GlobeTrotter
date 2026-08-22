import { createFileRoute } from '@tanstack/react-router';

import { MyTrips } from '@/features/trips/MyTrips';

export const Route = createFileRoute('/trips')({
  component: MyTrips,
});
