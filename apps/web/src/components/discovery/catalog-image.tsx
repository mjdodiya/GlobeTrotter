import { ImageOff } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

export function CatalogImage({
  alt,
  className,
  imageUrl,
}: {
  alt: string
  className?: string
  imageUrl: string | null
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const unavailable = !imageUrl || imageUrl === failedUrl

  if (unavailable || !imageUrl) {
    return (
      <div
        aria-label={`Image unavailable for ${alt}`}
        className={cn(
          "grid min-h-40 place-items-center bg-[radial-gradient(circle_at_top_left,var(--color-muted),transparent_70%)] text-muted-foreground",
          className,
        )}
        role="img"
      >
        <span className="flex flex-col items-center gap-2 text-xs font-medium">
          <ImageOff className="size-6" aria-hidden="true" />
          Image unavailable
        </span>
      </div>
    )
  }

  return (
    <img
      alt={alt}
      className={cn("min-h-40 w-full object-cover", className)}
      loading="lazy"
      onError={() => setFailedUrl(imageUrl)}
      src={imageUrl}
    />
  )
}
