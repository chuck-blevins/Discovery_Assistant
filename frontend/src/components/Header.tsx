import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, validateSession } from '../api/client'

export default function Header() {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    validateSession()
      .then((user) => setUserEmail(user.email))
      .catch(() => setUserEmail(null))
  }, [])

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <span className="text-lg font-semibold text-gray-900">Discovery App</span>
      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="text-sm text-gray-600 hidden sm:block">{userEmail}</span>
        )}
        <button
          onClick={handleLogout}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
