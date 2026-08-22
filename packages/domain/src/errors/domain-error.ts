export type DomainErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "DomainError"
    this.code = code
  }
}
