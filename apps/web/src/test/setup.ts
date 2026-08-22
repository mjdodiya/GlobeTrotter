// oxlint-disable-next-line import/no-unassigned-import -- installs DOM matchers for Vitest.
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

window.scrollTo = vi.fn()

afterEach(cleanup)
