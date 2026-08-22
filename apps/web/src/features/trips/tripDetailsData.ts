export type TripActivity = {
  name: string
  time: string
  cost: number | null
}

export type TripDay = {
  label: string
  date: string
  activities: TripActivity[]
}

export type TripDetails = {
  title: string
  dates: string
  location: string
  totalSpent: number
  days: TripDay[]
}

const parisDays: TripDay[] = [
  {
    label: "Day 1",
    date: "June 15, 2024",
    activities: [
      { name: "Arrival at CDG Airport · Transfer to Hotel", time: "12:00 PM", cost: 80 },
      { name: "Check-in at Hôtel Le Marais", time: "3:00 PM", cost: 250 },
      { name: "Evening stroll along Champs-Élysées", time: "7:00 PM", cost: null },
    ],
  },
  {
    label: "Day 2",
    date: "June 16, 2024",
    activities: [
      { name: "Louvre Museum Visit", time: "10:00 AM", cost: 32 },
      { name: "Lunch at Café de Flore", time: "1:00 PM", cost: 55 },
      { name: "Seine River Cruise", time: "5:30 PM", cost: 45 },
    ],
  },
  {
    label: "Day 3",
    date: "June 17, 2024",
    activities: [
      { name: "Eiffel Tower · Summit Visit", time: "9:00 AM", cost: 53 },
      { name: "Picnic at Champ de Mars", time: "1:00 PM", cost: 20 },
      { name: "Montmartre & Sacré-Cœur", time: "5:00 PM", cost: null },
    ],
  },
]

export const tripDetailsById: Record<string, TripDetails> = {
  "japan-adventure": {
    title: "Japan Adventure",
    dates: "Mar 18–28, 2024",
    location: "Tokyo, Kyoto, Osaka",
    totalSpent: 1180,
    days: [{ label: "Day 1", date: "March 18, 2024", activities: [{ name: "Arrival and Kyoto hotel check-in", time: "2:00 PM", cost: 210 }, { name: "Gion evening walk", time: "6:00 PM", cost: null }, { name: "Ramen dinner", time: "8:00 PM", cost: 35 }] }],
  },
  "barcelona-summer-escape": {
    title: "Barcelona Summer Escape",
    dates: "Aug 18–25, 2024",
    location: "Barcelona, Spain",
    totalSpent: 860,
    days: [{ label: "Day 1", date: "August 18, 2024", activities: [{ name: "Arrival and hotel check-in", time: "2:00 PM", cost: 220 }, { name: "Gothic Quarter walk", time: "6:00 PM", cost: null }, { name: "Tapas dinner in El Born", time: "8:00 PM", cost: 65 }] }],
  },
  "tokyo-autumn-adventure": {
    title: "Tokyo Autumn Adventure",
    dates: "Oct 5–14, 2024",
    location: "Tokyo, Japan",
    totalSpent: 1240,
    days: [{ label: "Day 1", date: "October 5, 2024", activities: [{ name: "Airport transfer and check-in", time: "3:00 PM", cost: 180 }, { name: "Shibuya crossing", time: "6:00 PM", cost: null }, { name: "Sushi dinner", time: "8:00 PM", cost: 85 }] }],
  },
  "paris-romantic-getaway": {
    title: "Paris Romantic Getaway",
    dates: "Jan 4–9, 2024",
    location: "Paris, France",
    totalSpent: 510,
    days: parisDays,
  },
  "nyc-weekend-break": {
    title: "NYC Weekend Break",
    dates: "Nov 15–22, 2023",
    location: "New York, USA",
    totalSpent: 730,
    days: [{ label: "Day 1", date: "November 15, 2023", activities: [{ name: "Hotel check-in in Manhattan", time: "3:00 PM", cost: 280 }, { name: "Times Square at night", time: "7:00 PM", cost: null }, { name: "Broadway show", time: "8:00 PM", cost: 120 }] }],
  },
  "bali-wellness-retreat": {
    title: "Bali Wellness Retreat",
    dates: "Sep 3–12, 2023",
    location: "Bali, Indonesia",
    totalSpent: 940,
    days: [{ label: "Day 1", date: "September 3, 2023", activities: [{ name: "Transfer to Ubud retreat", time: "1:00 PM", cost: 75 }, { name: "Sunset yoga session", time: "5:00 PM", cost: 30 }, { name: "Garden dinner", time: "7:30 PM", cost: 45 }] }],
  },
}

export function getTripDetails(tripId: string): TripDetails | undefined {
  return tripDetailsById[tripId]
}
