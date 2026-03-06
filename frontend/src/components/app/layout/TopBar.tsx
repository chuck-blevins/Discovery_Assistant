import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Menu, Sun, Moon, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { THEME_OPTIONS } from '@/lib/constants'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { api } from '@/lib/api'
import { useClient } from '@/hooks/useClients'
import { useProject } from '@/hooks/useProjects'

export function TopBar() {
  const navigate = useNavigate()
  const params = useParams<{ clientId?: string; projectId?: string }>()
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  const { theme, setTheme } = useTheme()
  const { data: client } = useClient(params.clientId)
  const { data: project } = useProject(params.projectId)
  const themeValue = theme ?? 'system'
  const [themeSelectOpen, setThemeSelectOpen] = useState(false)

  const ThemeIcon = themeValue === 'dark' ? Moon : themeValue === 'light' ? Sun : SunMoon

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore logout errors — proceed to redirect
    }
    navigate('/login', { replace: true })
  }

  const handleHamburger = () => {
    setCollapsed(false)
  }

  return (
    <header className="flex items-center h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
      {/* Hamburger — mobile only */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleHamburger}
            className={cn(
              'md:hidden mr-3 p-2 rounded',
              'hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400'
            )}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Open menu</TooltipContent>
      </Tooltip>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex-1">
        {!params.clientId && (
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Discovery App</span>
        )}
        {params.clientId && !params.projectId && (
          <ol className="flex items-center space-x-2 text-sm text-zinc-500 dark:text-zinc-400">
            <li>
              <Link to="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                All Projects
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-zinc-900 dark:text-zinc-100 font-medium" aria-current="page">
              {client?.name ?? 'Unknown Client'}
            </li>
          </ol>
        )}
        {params.clientId && params.projectId && (
          <ol className="flex items-center space-x-2 text-sm text-zinc-500 dark:text-zinc-400">
            <li>
              <Link to="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                All Projects
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/${params.clientId}`} className="hover:text-zinc-900 dark:hover:text-zinc-100">
                {client?.name ?? 'Unknown Client'}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-zinc-900 dark:text-zinc-100 font-medium" aria-current="page">
              {project?.name ?? 'Unknown Project'}
            </li>
          </ol>
        )}
      </nav>

      {/* Theme — tooltip disabled when dropdown is open so it doesn't block selection */}
      <Tooltip open={themeSelectOpen ? false : undefined}>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Select
              value={themeValue}
              onValueChange={(v) => setTheme(v)}
              open={themeSelectOpen}
              onOpenChange={setThemeSelectOpen}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  'h-8 mr-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 gap-1.5',
                  'w-[100px] data-[state=open]:w-[100px] data-[state=closed]:w-14 data-[state=closed]:min-w-14 data-[state=closed]:px-2',
                  'data-[state=closed]:[&_[data-slot=select-value]]:sr-only'
                )}
                aria-label="Appearance: light, dark, or system"
              >
                <ThemeIcon className="size-4 shrink-0" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Appearance (light / dark / system)</TooltipContent>
      </Tooltip>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className={cn(
          'ml-4 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400 rounded px-2 py-1'
        )}
      >
        Logout
      </button>
    </header>
  )
}
