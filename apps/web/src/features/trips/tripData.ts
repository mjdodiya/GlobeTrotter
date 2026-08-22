import suggestionImage from "@/assets/images/signinImg.jpg"

export type PlaceSuggestion = {
  title: string
  category: string
  image: string
}

export const placeSuggestions: PlaceSuggestion[] = [
  { title: "Eiffel Tower", category: "Iconic Landmark", image: suggestionImage },
  { title: "Louvre Museum", category: "World-Class Museum", image: suggestionImage },
  { title: "Seine River Cruise", category: "Boat Activity", image: suggestionImage },
  { title: "Montmartre District", category: "Neighborhood Walk", image: suggestionImage },
  { title: "Palace of Versailles", category: "Historical Site", image: suggestionImage },
  { title: "French Cooking Class", category: "Culinary Experience", image: suggestionImage },
]
