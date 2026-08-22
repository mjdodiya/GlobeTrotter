import { Link } from "@tanstack/react-router"
import {
  Compass,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react"
import { Dialog, DropdownMenu } from "radix-ui"
import type { ReactNode } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { AppSession } from "@/lib/session"
import { cn } from "@/lib/utils"

type NavigationItem = {
  icon: LucideIcon
  label: string
  to: "/" | "/dashboard" | "/trips"
  hash?: string
}

const publicNavigation: readonly NavigationItem[] = [
  { icon: Compass, label: "Discover", to: "/" },
  { icon: Compass, label: "How it works", to: "/", hash: "how-it-works" },
]

const authenticatedNavigation: readonly NavigationItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Map, label: "My Trips", to: "/trips" },
] as const

function Brand() {
  return (
    <Link to="/" className="inline-flex min-w-0 items-center gap-2 rounded-lg font-semibold">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Compass className="size-4" aria-hidden="true" />
      </span>
      <span className="truncate">GlobeTrotter</span>
    </Link>
  )
}

function MobileNavigation({ authenticated }: { authenticated: boolean }) {
  const navigation = authenticated ? authenticatedNavigation : publicNavigation

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline" size="icon" className="md:hidden">
          <Menu aria-hidden="true" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,calc(100%-2rem))] flex-col gap-6 border-l bg-background p-5 shadow-xl motion-safe:animate-in motion-safe:slide-in-from-right">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="font-semibold">Navigation</Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon">
                <X aria-hidden="true" />
                <span className="sr-only">Close navigation</span>
              </Button>
            </Dialog.Close>
          </div>
          <nav aria-label="Mobile" className="flex flex-col gap-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Dialog.Close asChild key={item.label}>
                  <Link
                    to={item.to}
                    {...(item.hash ? { hash: item.hash } : {})}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </Dialog.Close>
              )
            })}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {publicNavigation.map((item) => (
              <Button key={item.label} asChild variant="ghost">
                <Link to={item.to} {...(item.hash ? { hash: item.hash } : {})}>
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <MobileNavigation authenticated={false} />
          </div>
        </div>
      </header>
      <main id="main-content" className="min-w-0 flex-1">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Plan thoughtfully. Travel confidently.
      </footer>
    </div>
  )
}

function AccountMenu({ onSignOut, user }: { onSignOut: () => void; user: AppSession["user"] }) {
  const identity = String(user.name || user.email)
  const initials = identity
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-10 max-w-56 gap-2 px-2"
          aria-label="Open account menu"
        >
          <Avatar size="sm">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 truncate sm:inline">{user.name || user.email}</span>
          <span className="sr-only">Open account menu</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in"
        >
          <DropdownMenu.Label className="min-w-0 px-2 py-1.5">
            <span className="block truncate text-sm font-medium">{user.name || "Traveler"}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              to="/account"
              className="flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-accent"
            >
              <Settings className="size-4" aria-hidden="true" /> Account settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive outline-none focus:bg-destructive/10"
            onSelect={onSignOut}
          >
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function AuthenticatedNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Workspace" className={cn("flex flex-col gap-1", className)}>
      {authenticatedNavigation.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          activeProps={{ "aria-current": "page", className: "bg-accent text-accent-foreground" }}
          className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <item.icon className="size-4" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

function AuthenticatedFrame({ account, children }: { account: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-muted/25">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <div className="flex min-w-0 items-center gap-1">
            <MobileNavigation authenticated />
            {account}
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[100rem] min-w-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r bg-background p-4 md:block">
          <AuthenticatedNav />
        </aside>
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AuthenticatedShell({
  children,
  onSignOut,
  session,
}: {
  children: ReactNode
  onSignOut: () => void
  session: AppSession
}) {
  return (
    <AuthenticatedFrame account={<AccountMenu user={session.user} onSignOut={onSignOut} />}>
      {children}
    </AuthenticatedFrame>
  )
}

export function AuthenticatedShellPlaceholder({ children }: { children: ReactNode }) {
  return (
    <AuthenticatedFrame
      account={
        <div
          className="h-8 w-24 rounded-lg bg-muted motion-safe:animate-pulse"
          aria-hidden="true"
        />
      }
    >
      {children}
    </AuthenticatedFrame>
  )
}
