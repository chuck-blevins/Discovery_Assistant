import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { ClientList } from '@/components/app/clients/ClientList'
import { useRevenueDashboard } from '@/hooks/useInvoices'
import { useClients } from '@/hooks/useClients'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function RevenueCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{formatCurrency(value)}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function RevenueDashboard() {
  const { data, isLoading } = useRevenueDashboard()

  if (isLoading || !data) return null

  const hasRevenue = data.pipeline > 0 || data.contracted > 0 || data.outstanding > 0 || data.collected_month > 0

  if (!hasRevenue && data.renewal_alerts.length === 0) return null

  return (
    <div className="mb-8 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Revenue Overview</h2>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <RevenueCard label="Pipeline" value={data.pipeline} />
        <RevenueCard label="Contracted" value={data.contracted} sub="remaining" />
        <RevenueCard
          label="Outstanding"
          value={data.outstanding}
          sub={
            data.outstanding_aging['60_plus_days'] > 0
              ? `${formatCurrency(data.outstanding_aging['60_plus_days'])} 60+ days`
              : undefined
          }
        />
        <RevenueCard
          label="Collected"
          value={data.collected_month}
          sub={`${formatCurrency(data.collected_ytd)} YTD`}
        />
      </div>

      {/* Renewal alerts */}
      {data.renewal_alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-2">
            Contracts Ending Soon
          </p>
          <ul className="space-y-1">
            {data.renewal_alerts.map((alert) => (
              <li key={alert.client_id} className="flex items-center justify-between text-sm">
                <Link to={`/${alert.client_id}`} className="text-amber-900 dark:text-amber-200 hover:underline font-medium">
                  {alert.client_name}
                </Link>
                <span className="text-amber-700 dark:text-amber-400 text-xs">
                  {alert.days_remaining === 0 ? 'Ends today' : `${alert.days_remaining}d remaining`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const STALE_DAYS = 21

function AttentionQueue() {
  const { data: clients = [] } = useClients(false)
  const { data: revenue } = useRevenueDashboard()

  const now = Date.now()
  const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000

  const staleClients = clients.filter((c) => {
    if (c.status !== 'active') return false
    if (c.engagement_status == null) return false
    return now - new Date(c.updated_at).getTime() > staleMs
  })

  const overdueAmount = revenue?.outstanding_aging?.['60_plus_days'] ?? 0

  if (staleClients.length === 0 && overdueAmount === 0) return null

  return (
    <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
        <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wide">
          Needs Attention
        </p>
      </div>
      {overdueAmount > 0 && (
        <p className="text-sm text-orange-800 dark:text-orange-200">
          {formatCurrency(overdueAmount)} in invoices overdue 60+ days
        </p>
      )}
      {staleClients.length > 0 && (
        <div>
          <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">
            No activity in {STALE_DAYS}+ days:
          </p>
          <ul className="space-y-0.5">
            {staleClients.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/${c.id}`}
                  className="text-sm text-orange-900 dark:text-orange-200 hover:underline font-medium"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <>
      <AttentionQueue />
      <RevenueDashboard />
      <ClientList />
    </>
  )
}
