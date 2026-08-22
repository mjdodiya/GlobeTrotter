export type ItinerarySection = {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  budget: number
}

export const initialSections: ItinerarySection[] = [
  {
    id: "flights",
    title: "Section 1: Flights & Transfers",
    description: "Round-trip flights, airport transfers, and all travel logistics between cities.",
    startDate: "2024-06-15",
    endDate: "2024-06-15",
    budget: 620,
  },
  {
    id: "accommodation",
    title: "Section 2: Accommodation",
    description: "Hotel bookings, check-in and check-out details for all nights in Paris.",
    startDate: "2024-06-15",
    endDate: "2024-06-21",
    budget: 1200,
  },
  {
    id: "sightseeing",
    title: "Section 3: Sightseeing & Activities",
    description: "Museum visits, landmarks, walking tours, and cultural experiences across the city.",
    startDate: "2024-06-16",
    endDate: "2024-06-20",
    budget: 480,
  },
]
