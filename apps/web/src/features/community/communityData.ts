export type CommunityPost = {
  id: string
  author: string
  initials: string
  title: string
  location: string
  excerpt: string
  likes: number
  comments: number
  image: string
}

export const communityPosts: CommunityPost[] = [
  { id: "barcelona", author: "Maya Chen", initials: "MC", title: "A slow weekend in Barcelona", location: "Barcelona, Spain", excerpt: "The best parts of the city were found between the big landmarks: a market breakfast, quiet courtyards, and sunset by the sea.", likes: 128, comments: 18, image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=85" },
  { id: "kyoto", author: "Jon Bell", initials: "JB", title: "Three days in Kyoto", location: "Kyoto, Japan", excerpt: "A thoughtful route through gardens, small ramen counters, and the lantern-lit streets of Gion.", likes: 96, comments: 12, image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=900&q=85" },
  { id: "dolomites", author: "Sofia Rossi", initials: "SR", title: "A first-timer's Dolomites guide", location: "South Tyrol, Italy", excerpt: "What to pack, where to pause, and how to leave enough room in the itinerary for the view to surprise you.", likes: 74, comments: 9, image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85" },
]
