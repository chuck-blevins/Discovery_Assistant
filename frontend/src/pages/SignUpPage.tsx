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
      navigate('/settings?setup=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 text-foreground">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-2">Create account</h1>
        <p className="text-muted-foreground mb-6">Start your Discovery App journey</p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] rounded-md border border-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] rounded-md border border-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
            <label htmlFor="confirm" className="block text-sm font-medium text-foreground mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full min-h-[44px] rounded-md border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                confirm.length > 0 && !passwordsMatch
                  ? 'border-destructive'
                  : 'border-input'
              }`}
              placeholder="••••••••"
            />
            {confirm.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline inline-block py-1 px-1">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
