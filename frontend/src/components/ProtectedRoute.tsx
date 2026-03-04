import { useEffect, useState, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { validateSession } from '../api/client'

interface Props {
  children: ReactNode
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

export default function ProtectedRoute({ children }: Props) {
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    validateSession()
      .then(() => setAuthState('authenticated'))
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

  return <>{children}</>
}
