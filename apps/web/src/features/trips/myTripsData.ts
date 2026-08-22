import type { PreviousTrip } from "@/features/home/homeData"

export type TripStatus = "Ongoing" | "Upcoming" | "Completed"

export type UserTrip = Omit<PreviousTrip, "status"> & {
  id: string
  status: TripStatus
  duration: string
}

export const userTrips: UserTrip[] = [
  {
    id: "barcelona-summer-escape",
    title: "Barcelona Summer Escape",
    location: "Barcelona, Spain",
    date: "Aug 18–25, 2024",
    duration: "7 days",
    image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=500&q=85",
    status: "Ongoing",
  },
  {
    id: "tokyo-autumn-adventure",
    title: "Tokyo Autumn Adventure",
    location: "Tokyo, Japan",
    date: "Oct 5–14, 2024",
    duration: "9 days",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=500&q=85",
    status: "Upcoming",
  },
  {
    id: "paris-romantic-getaway",
    title: "Paris Romantic Getaway",
    location: "Paris, France",
    date: "Jan 4–9, 2024",
    duration: "5 days",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=85",
    status: "Completed",
  },
  {
    id: "nyc-weekend-break",
    title: "NYC Weekend Break",
    location: "New York, USA",
    date: "Nov 15–22, 2023",
    duration: "7 days",
    image: "https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=500&q=85",
    status: "Completed",
  },
  {
    id: "bali-wellness-retreat",
    title: "Bali Wellness Retreat",
    location: "Bali, Indonesia",
    date: "Sep 3–12, 2023",
    duration: "9 days",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=500&q=85",
    status: "Completed",
  },
]
