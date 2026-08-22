import heroImage from "@/assets/images/signinImg.jpg"

export type NavigationItem = {
  label: string
  href: string
}

export type Destination = {
  name: string
  country: string
  image: string
  accent: string
}

export type PreviousTrip = {
  tripId?: string
  title: string
  location: string
  date: string
  image: string
  status: "Completed" | "Upcoming"
}

export const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "My Trips", href: "/trips" },
  { label: "Community", href: "/community" },
  { label: "Calendar", href: "/calendar" },
]

export const destinations: Destination[] = [
  {
    name: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=85",
    accent: "#f2bf55",
  },
  {
    name: "Bali",
    country: "Indonesia",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=85",
    accent: "#7aa66e",
  },
  {
    name: "Tokyo",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=85",
    accent: "#df6b5e",
  },
  {
    name: "New York",
    country: "USA",
    image: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=900&q=85",
    accent: "#6c90c4",
  },
  {
    name: "Santorini",
    country: "Greece",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=900&q=85",
    accent: "#4d9eaa",
  },
]

export const previousTrips: PreviousTrip[] = [
  {
    tripId: "japan-adventure",
    title: "Japan Adventure",
    location: "Tokyo · Kyoto · Osaka",
    date: "Mar 18–28, 2024",
    image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=85",
    status: "Completed",
  },
  {
    tripId: "paris-romantic-getaway",
    title: "Paris Getaway",
    location: "Paris, France",
    date: "Jan 4–9, 2024",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85",
    status: "Completed",
  },
  {
    tripId: "nyc-weekend-break",
    title: "NYC Weekend",
    location: "New York, USA",
    date: "Nov 15–22, 2023",
    image: "https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1200&q=85",
    status: "Completed",
  },
]

export { heroImage }
