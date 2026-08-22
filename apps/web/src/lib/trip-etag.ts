declare const tripEtagBrand: unique symbol

export type TripEtag = string & { readonly [tripEtagBrand]: true }

export class MissingTripEtagError extends Error {
  constructor() {
    super("The Trip response did not include a valid ETag. Refresh before editing.")
    this.name = "MissingTripEtagError"
  }
}

export function captureTripEtag(value: string | null): TripEtag {
  if (!value || !/^"[1-9]\d*"$/.test(value)) throw new MissingTripEtagError()
  return value as TripEtag
}

export function ifMatchHeaders(etag: TripEtag): { "If-Match": TripEtag } {
  return { "If-Match": etag }
}
