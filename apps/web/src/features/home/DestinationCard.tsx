import type { Destination } from "./homeData"

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <article className="group relative h-[184px] min-w-[220px] overflow-hidden rounded-xl bg-[#173452] shadow-[0_5px_14px_rgba(16,43,73,.12)] sm:h-[198px] sm:min-w-0">
      <img src={destination.image} alt={`${destination.name}, ${destination.country}`} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#102b49]/90 via-[#102b49]/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4">
        <div>
          <h3 className="font-heading text-2xl font-semibold leading-none text-white">{destination.name}</h3>
          <p className="mt-1 text-[11px] text-white/75">{destination.country}</p>
        </div>
        <span className="size-2 rounded-full" style={{ backgroundColor: destination.accent }} aria-hidden="true" />
      </div>
    </article>
  )
}
