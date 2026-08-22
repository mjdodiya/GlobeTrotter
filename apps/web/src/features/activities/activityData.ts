export type Activity = {
  id: string
  title: string
  location: string
  duration: string
  price: number
  rating: number
  reviews: number
  category: string
}

export const activities: Activity[] = [
  { id: "interlaken", title: "Paragliding over Interlaken", location: "Interlaken, Switzerland", duration: "2 hrs", price: 189, rating: 4.9, reviews: 234, category: "Adventure" },
  { id: "queenstown", title: "Paragliding in Queenstown", location: "Queenstown, New Zealand", duration: "1.5 hrs", price: 145, rating: 4.8, reviews: 189, category: "Adventure" },
  { id: "cape-town", title: "Paragliding over Cape Town", location: "Cape Town, South Africa", duration: "1 hr", price: 120, rating: 4.7, reviews: 156, category: "Adventure" },
  { id: "oludeniz", title: "Tandem Paragliding – Oludeniz", location: "Oludeniz, Turkey", duration: "30 min", price: 95, rating: 4.8, reviews: 412, category: "Adventure" },
  { id: "bir-billing", title: "Paragliding in Bir Billing", location: "Himachal Pradesh, India", duration: "15–30 min", price: 40, rating: 4.6, reviews: 301, category: "Adventure" },
  { id: "chamonix", title: "Paragliding – Chamonix Valley", location: "Chamonix, France", duration: "45 min", price: 175, rating: 4.9, reviews: 98, category: "Adventure" },
  { id: "rio", title: "Paragliding in Rio de Janeiro", location: "Rio de Janeiro, Brazil", duration: "20–30 min", price: 130, rating: 4.7, reviews: 278, category: "Adventure" },
]
