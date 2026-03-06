import { useNavigate, useParams, Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { api } from '@/lib/api'
import { useClient } from '@/hooks/useClients'
import { useProject } from '@/hooks/useProjects'

export function TopBar() {
  const navigate = useNavigate()
  const params = useParams<{ clientId?: string; projectId?: string }>()
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  const { data: client } = useClient(params.clientId)
  const { data: project } = useProject(params.projectId)

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
    <header className="flex items-center h-14 px-4 border-b border-zinc-200 bg-white shrink-0">
      {/* Hamburger — mobile only */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleHamburger}
            className={cn(
              'md:hidden mr-3 p-2 rounded',
              'hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400'
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
          <span className="text-sm font-medium text-zinc-700">Discovery App</span>
        )}
        {params.clientId && !params.projectId && (
          <ol className="flex items-center space-x-2 text-sm text-zinc-500">
            <li>
              <Link to="/" className="hover:text-zinc-900">
                All Projects
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-zinc-900 font-medium" aria-current="page">
              {client?.name ?? 'Unknown Client'}
            </li>
          </ol>
        )}
        {params.clientId && params.projectId && (
          <ol className="flex items-center space-x-2 text-sm text-zinc-500">
            <li>
              <Link to="/" className="hover:text-zinc-900">
                All Projects
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/${params.clientId}`} className="hover:text-zinc-900">
                {client?.name ?? 'Unknown Client'}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-zinc-900 font-medium" aria-current="page">
              {project?.name ?? 'Unknown Project'}
            </li>
          </ol>
        )}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className={cn(
          'ml-4 text-sm text-zinc-600 hover:text-zinc-900',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400 rounded px-2 py-1'
        )}
      >
        Logout
      </button>
    </header>
  )
}
