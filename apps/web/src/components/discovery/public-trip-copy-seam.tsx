import { TripCopyControl } from "@/components/sharing/trip-copy-control"

export function PublicTripCopySeam({ tripId }: { tripId: string }) {
  return <TripCopyControl source={{ kind: "public", tripId }} />
}
