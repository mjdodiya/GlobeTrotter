import { useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"

export function RouteFocus() {
  const href = useRouterState({ select: (state) => state.location.href })

  useEffect(() => {
    if (!href) return
    const frame = window.requestAnimationFrame(() => {
      const main = document.getElementById("main-content")
      const target = main?.querySelector<HTMLElement>("[data-route-heading]") ?? main
      if (!target) return
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1
      target.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [href])

  return null
}
