import Header from '../components/Header'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-500">Welcome to Discovery App. Your clients and projects will appear here.</p>
      </main>
    </div>
  )
}
