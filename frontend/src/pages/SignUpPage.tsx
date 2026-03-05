import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup, login } from '../api/client'

function passwordFeedback(password: string) {
  return {
    length: password.length >= 8,
    hasNumber: /\d/.test(password),
  }
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const feedback = passwordFeedback(password)
  const passwordsMatch = password === confirm

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!feedback.length || !feedback.hasNumber) {
      setError('Password must be 8+ characters and include at least one number.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await signup(email, password)
      // Auto-login after successful signup
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 text-gray-900">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create account</h1>
        <p className="text-gray-500 mb-6">Start your Discovery App journey</p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {/* Real-time password feedback */}
          {password.length > 0 && (
            <ul className="mb-4 space-y-1 text-xs">
              <li className={feedback.length ? 'text-green-600' : 'text-red-500'}>
                {feedback.length ? '✓' : '✗'} 8+ characters
              </li>
              <li className={feedback.hasNumber ? 'text-green-600' : 'text-red-500'}>
                {feedback.hasNumber ? '✓' : '✗'} At least one number
              </li>
            </ul>
          )}

          <div className="mb-6">
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                confirm.length > 0 && !passwordsMatch
                  ? 'border-red-400'
                  : 'border-gray-300'
              }`}
              placeholder="••••••••"
            />
            {confirm.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
