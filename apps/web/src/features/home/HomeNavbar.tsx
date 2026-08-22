import { Link } from '@tanstack/react-router';
import { Menu, Plane, UserRound, X } from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { navigationItems } from './homeData';

export function HomeNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="border-b border-[#173452] bg-[#102b49] text-white">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          to="/"
          className="flex items-center gap-2"
          aria-label="GlobeTrotter home">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#f3c969] text-[#102b49]">
            <Plane
              className="size-4 -rotate-12"
              aria-hidden="true"
            />
          </span>
          <span className="font-heading text-[27px] font-semibold leading-none tracking-tight">
            GlobeTrotter
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Main navigation">
          {navigationItems.map((item) =>
            item.href === '/' ? (
              <Link
                key={item.label}
                to="/"
                activeOptions={{ exact: true }}
                className="rounded-md px-4 py-2 text-[12px] font-medium text-[#b8c8d7] transition-colors hover:bg-white/10 hover:text-white data-[status=active]:bg-[#2c4966] data-[status=active]:text-white">
                {item.label}
              </Link>
            ) : item.href === '/trips' ? (
              <Link
                key={item.label}
                to="/trips"
                className="rounded-md px-4 py-2 text-[12px] font-medium text-[#b8c8d7] transition-colors hover:bg-white/10 hover:text-white data-[status=active]:bg-[#2c4966] data-[status=active]:text-white">
                {item.label}
              </Link>
            ) : item.href === '/community' ? (
              <Link key={item.label} to="/community" className="rounded-md px-4 py-2 text-[12px] font-medium text-[#b8c8d7] transition-colors hover:bg-white/10 hover:text-white data-[status=active]:bg-[#2c4966] data-[status=active]:text-white">
                {item.label}
              </Link>
            ) : item.href === '/calendar' ? (
              <Link key={item.label} to="/calendar" className="rounded-md px-4 py-2 text-[12px] font-medium text-[#b8c8d7] transition-colors hover:bg-white/10 hover:text-white data-[status=active]:bg-[#2c4966] data-[status=active]:text-white">
                {item.label}
              </Link>
            ) : item.href === '/admin' ? (
              <Link key={item.label} to="/admin" className="rounded-md px-4 py-2 text-[12px] font-medium text-[#b8c8d7] transition-colors hover:bg-white/10 hover:text-white data-[status=active]:bg-[#2c4966] data-[status=active]:text-white">
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="rounded-md px-4 py-2 text-[12px] font-medium text-[#b8c8d7] transition-colors hover:bg-white/10 hover:text-white">
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <span className="text-[11px] text-[#b8c8d7]">Welcome back, Alex</span>
          <Link to="/profile" aria-label="Open Alexandra Smith profile" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3c969]">
            <Avatar className="size-9 border border-white/20 bg-[#f0d3a3]">
              <AvatarFallback className="bg-[#f0d3a3] text-xs font-semibold text-[#102b49]">AS</AvatarFallback>
            </Avatar>
          </Link>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white lg:hidden"
          aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {isOpen ? (
        <nav
          className="border-t border-white/10 px-5 py-3 lg:hidden"
          aria-label="Mobile navigation">
          {navigationItems.map((item) =>
            item.href === '/trips' ? (
              <Link
                key={item.label}
                to="/trips"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 border-b border-white/10 px-2 py-3 text-sm text-[#d7e2eb] last:border-0 hover:text-[#f3c969]">
                <UserRound
                  className="size-4 opacity-70"
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            ) : item.href === '/community' ? (
              <Link key={item.label} to="/community" onClick={() => setIsOpen(false)} className="flex items-center gap-3 border-b border-white/10 px-2 py-3 text-sm text-[#d7e2eb] last:border-0 hover:text-[#f3c969]"><UserRound className="size-4 opacity-70" aria-hidden="true" />{item.label}</Link>
            ) : item.href === '/calendar' ? (
              <Link key={item.label} to="/calendar" onClick={() => setIsOpen(false)} className="flex items-center gap-3 border-b border-white/10 px-2 py-3 text-sm text-[#d7e2eb] last:border-0 hover:text-[#f3c969]"><UserRound className="size-4 opacity-70" aria-hidden="true" />{item.label}</Link>
            ) : item.href === '/admin' ? (
              <Link key={item.label} to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 border-b border-white/10 px-2 py-3 text-sm text-[#d7e2eb] last:border-0 hover:text-[#f3c969]"><UserRound className="size-4 opacity-70" aria-hidden="true" />{item.label}</Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 border-b border-white/10 px-2 py-3 text-sm text-[#d7e2eb] last:border-0 hover:text-[#f3c969]">
                <UserRound
                  className="size-4 opacity-70"
                  aria-hidden="true"
                />
                {item.label}
              </a>
            ),
          )}
          <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 border-t border-white/10 px-2 py-3 text-sm text-[#d7e2eb] hover:text-[#f3c969]"><UserRound className="size-4 opacity-70" aria-hidden="true" />Profile</Link>
        </nav>
      ) : null}
    </header>
  );
}
