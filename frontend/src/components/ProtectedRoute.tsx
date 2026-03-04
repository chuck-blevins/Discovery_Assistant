import { useEffect, useState, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { validateSession } from '../api/client'
import { getLLMSettings } from '../api/settings'

interface Props {
  children: ReactNode
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'needs-setup'

export default function ProtectedRoute({ children }: Props) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const location = useLocation()

  useEffect(() => {
    validateSession()
      .then(() => getLLMSettings())
      .then((settings) => {
        if (!settings.api_key_is_set) {
          setAuthState('needs-setup')
        } else {
          setAuthState('authenticated')
        }
      })
      .catch(() => setAuthState('unauthenticated'))
  }, [])

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (authState === 'needs-setup' && location.pathname !== '/settings') {
    return <Navigate to="/settings?setup=true" replace />
  }

  return <>{children}</>
}
