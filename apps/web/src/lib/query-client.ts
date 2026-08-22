import { QueryClient } from "@tanstack/react-query"

import { ApiProblemError } from "./http"

function retryQuery(failureCount: number, error: Error): boolean {
  if (error instanceof ApiProblemError && error.problem.status < 500) return false
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: false,
    },
    queries: {
      refetchOnWindowFocus: false,
      retry: retryQuery,
      staleTime: 30_000,
    },
  },
})
