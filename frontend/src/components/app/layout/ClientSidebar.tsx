import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useClientFormStore } from '@/stores/useClientFormStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LayoutDashboard, ChevronLeft, ChevronRight, Plus, BookOpen, SlidersHorizontal, ExternalLink } from 'lucide-react'
import { getStripeSettings } from '@/api/settings'

export function ClientSidebar() {
  const location = useLocation()
  const collapsed = useSidebarStore((s) => s.collapsed)
  const toggle = useSidebarStore((s) => s.toggle)
  const openCreate = useClientFormStore((s) => s.openCreate)
  const isDashboard = location.pathname === '/'
  const isHelp = location.pathname === '/help'
  const isSettings = location.pathname === '/settings'

  const { data: stripeSettings } = useQuery({
    queryKey: ['settings', 'stripe'],
    queryFn: getStripeSettings,
    staleTime: 5 * 60 * 1000,
  })
  const customerPortalUrl = stripeSettings?.customer_portal_url ?? null

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-full bg-zinc-900 text-zinc-100 flex-shrink-0 transition-all duration-200 motion-reduce:transition-none',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Wordmark */}
      <div className="flex items-center h-16 px-4 border-b border-zinc-800">
        <LayoutDashboard className="w-5 h-5 shrink-0 text-zinc-300" aria-hidden="true" />
        {!collapsed && (
          <span className="ml-3 font-semibold text-zinc-50 truncate">Discovery</span>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          <li>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/"
                    className={cn(
                      'flex items-center justify-center w-full rounded p-2',
                      'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400',
                      isDashboard && 'bg-zinc-800'
                    )}
                    aria-label="All Clients"
                  >
                    <LayoutDashboard className="w-5 h-5 text-zinc-300" aria-hidden="true" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">All Clients</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                to="/"
                className={cn(
                  'flex items-center w-full rounded px-3 py-2 text-sm',
                  'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400',
                  isDashboard && 'bg-zinc-800'
                )}
              >
                <LayoutDashboard className="w-4 h-4 mr-3 text-zinc-300 shrink-0" aria-hidden="true" />
                <span className="text-zinc-200">All Clients</span>
              </Link>
            )}
          </li>
        </ul>
      </nav>

      {/* Footer: settings + help + collapse toggle + new client */}
      <div className="border-t border-zinc-800 p-2 space-y-1">
        {/* Customer Portal link — only shown when configured */}
        {customerPortalUrl && (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={customerPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full rounded p-2 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400"
                  aria-label="Customer Portal"
                >
                  <ExternalLink className="w-5 h-5 text-zinc-300" aria-hidden="true" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="right">Customer Portal</TooltipContent>
            </Tooltip>
          ) : (
            <a
              href={customerPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center w-full rounded px-3 py-2 text-sm hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400"
            >
              <ExternalLink className="w-4 h-4 mr-3 text-zinc-300 shrink-0" aria-hidden="true" />
              <span className="text-zinc-200">Customer Portal</span>
            </a>
          )
        )}
        {/* Settings link */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className={cn(
                  'flex items-center justify-center w-full rounded p-2',
                  'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400',
                  isSettings && 'bg-zinc-800'
                )}
                aria-label="Settings"
              >
                <SlidersHorizontal className="w-5 h-5 text-zinc-300" aria-hidden="true" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/settings"
            className={cn(
              'flex items-center w-full rounded px-3 py-2 text-sm',
              'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400',
              isSettings && 'bg-zinc-800'
            )}
          >
            <SlidersHorizontal className="w-4 h-4 mr-3 text-zinc-300 shrink-0" aria-hidden="true" />
            <span className="text-zinc-200">Settings</span>
          </Link>
        )}
        {/* Help / User Guide link */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/help"
                className={cn(
                  'flex items-center justify-center w-full rounded p-2',
                  'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400',
                  isHelp && 'bg-zinc-800'
                )}
                aria-label="User Guide"
              >
                <BookOpen className="w-5 h-5 text-zinc-300" aria-hidden="true" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">User Guide</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/help"
            className={cn(
              'flex items-center w-full rounded px-3 py-2 text-sm',
              'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400',
              isHelp && 'bg-zinc-800'
            )}
          >
            <BookOpen className="w-4 h-4 mr-3 text-zinc-300 shrink-0" aria-hidden="true" />
            <span className="text-zinc-200">User Guide</span>
          </Link>
        )}
      </div>

      <div className="border-t border-zinc-800 p-2 space-y-1">
        {/* New Client button */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={openCreate}
                className={cn(
                  'flex items-center justify-center w-full rounded p-2',
                  'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400'
                )}
                aria-label="New Client"
              >
                <Plus className="w-5 h-5 text-zinc-300" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">New Client</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={openCreate}
            className={cn(
              'flex items-center w-full rounded px-3 py-2 text-sm',
              'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400'
            )}
          >
            <Plus className="w-4 h-4 mr-3 text-zinc-300 shrink-0" aria-hidden="true" />
            <span className="text-zinc-200">New Client</span>
          </button>
        )}

        {/* Collapse toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggle}
              className={cn(
                'flex items-center justify-center w-full rounded p-2',
                'hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-zinc-400" aria-hidden="true" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-zinc-400" aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}