import { Link } from 'react-router-dom'
import { ClientList } from '@/components/app/clients/ClientList'
import { useRevenueDashboard } from '@/hooks/useInvoices'

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

export default function DashboardPage() {
  return (
    <>
      <RevenueDashboard />
      <ClientList />
    </>
  )
}
