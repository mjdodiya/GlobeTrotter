import { destinations, previousTrips } from "@/features/home/homeData"

export type PlannedTrip = {
  title: string
  location: string
  status: "Planned" | "Draft"
  image: string
}

export const plannedTrips: PlannedTrip[] = [
  { title: "Maldives Honeymoon", location: "Maldives", status: "Planned", image: destinations[4]?.image ?? destinations[0]?.image ?? "" },
  { title: "Safari Kenya 2025", location: "Nairobi, Kenya", status: "Planned", image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=700&q=85" },
  { title: "Northern Lights", location: "Iceland", status: "Draft", image: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=700&q=85" },
]

export const profileStats = [
  { label: "Trips Taken", value: "12" },
  { label: "Countries Visited", value: "8" },
  { label: "Upcoming", value: "3" },
  { label: "Activities Done", value: "48" },
]

export { previousTrips }
