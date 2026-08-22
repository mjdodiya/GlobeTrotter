import { ArrowDown, Clock } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

import type { TripDay } from "./tripDetailsData"

export function TripDayCard({ day }: { day: TripDay }) {
  const dayTotal = day.activities.reduce((total, activity) => total + (activity.cost ?? 0), 0)

  return (
    <Card className="overflow-hidden rounded-xl border-[#e1e7eb] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)]">
      <div className="flex items-center justify-between bg-[#102b49] px-4 py-3 text-white">
        <h2 className="text-xs font-semibold">{day.label}</h2>
        <span className="text-[10px] text-[#c8d7e3]">{day.date}</span>
      </div>
      <CardContent className="p-3 sm:p-4">
        <div className="mb-2 flex justify-between px-1 text-[9px] font-semibold uppercase tracking-[.12em] text-[#8ba0b0]"><span>Planned activity</span><span>Expense</span></div>
        <div className="space-y-2">
          {day.activities.map((activity, index) => (
            <div key={activity.name}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-lg bg-[#f4f7fa] px-3 py-2.5">
                  <p className="truncate text-[11px] font-semibold text-[#526984]">{activity.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-[9px] text-[#8ba0b0]"><Clock className="size-2.5" aria-hidden="true" />{activity.time}</p>
                </div>
                <span className="w-12 shrink-0 text-right text-[10px] font-semibold text-[#526984]">{activity.cost === null ? "Free" : `$${activity.cost}`}</span>
              </div>
              {index < day.activities.length - 1 ? <ArrowDown className="ml-4 mt-1 size-3 text-[#b8cbd5]" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#edf0f2] pt-3 text-[10px] text-[#8ba0b0]"><span>Day total</span><strong className="text-[#0f2744]">${dayTotal}</strong></div>
      </CardContent>
    </Card>
  )
}
