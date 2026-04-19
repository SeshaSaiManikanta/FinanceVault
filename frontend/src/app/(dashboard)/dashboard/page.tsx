'use client';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtK(n: number) { return n >= 100000 ? '₹' + (n / 100000).toFixed(1) + 'L' : fmt(n); }

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.summary().then(r => r.data.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-sm text-gray-400 p-8 text-center">Loading dashboard...</div>;

  const kpis = data?.kpis || {};
  const dueToday = data?.dueToday || [];
  const recentLoans = data?.recentLoans || [];
  const loanTypeBreakdown = data?.loanTypeBreakdown || [];
  const monthlyCollections = data?.monthlyCollections || {};

  const collectionChartData = Object.entries(monthlyCollections)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short' }),
      amount: amount as number,
    }));

  const pieData = loanTypeBreakdown.map((b: any) => ({
    name: `${b.loanType?.icon || ''} ${b.loanType?.name || ''}`,
    value: b.total,
    color: b.loanType?.color || '#BA7517',
  }));

  const kpiCards = [
    { label: 'Total Disbursed', value: fmtK(kpis.totalDisbursed || 0), sub: 'Portfolio value', color: '#FAEEDA', icon: '💰' },
    { label: 'Active Loans', value: kpis.activeLoans || 0, sub: `${kpis.overdueLoans || 0} overdue`, color: '#E6F1FB', icon: '📋' },
    { label: 'EMI Due Today', value: fmtK(kpis.emiDueToday || 0), sub: `${kpis.emiDueTodayCount || 0} accounts`, color: '#EAF3DE', icon: '📅', warn: true },
    { label: 'Overdue (NPA)', value: fmtK(kpis.overdueAmount || 0), sub: `${kpis.overdueCount || 0} customers`, color: '#FCEBEB', icon: '⚠️', danger: true },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {kpiCards.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="absolute right-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: k.color }}>{k.icon}</div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-semibold ${k.danger ? 'text-red-700' : k.warn ? 'text-amber-700' : 'text-gray-900'}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Loan type KPIs */}
      {loanTypeBreakdown.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(loanTypeBreakdown.length, 5)}, minmax(0, 1fr))` }}>
          {loanTypeBreakdown.map((b: any) => (
            <div key={b.loanType?.id} className="card" style={{ borderLeft: `3px solid ${b.loanType?.color}` }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{b.loanType?.icon} {b.loanType?.name}</p>
              <p className="text-xl font-semibold">{fmtK(b.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{b.count} active</p>
            </div>
          ))}
        </div>
      )}

      {/* Middle row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Due today */}
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="card-title text-sm font-semibold">EMI Due Today</h3>
            <button onClick={() => router.push('/emi')} className="text-xs text-amber-600 hover:underline">View all</button>
          </div>
          {dueToday.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">No EMIs due today 🎉</p>
          ) : (
            <div className="space-y-2">
              {dueToday.slice(0, 5).map((d: any) => (
                <div key={d.repaymentId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold">{d.customerName}</p>
                    <p className="text-xs text-gray-400">{d.loanNumber} · {d.loanType?.icon} {d.loanType?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(d.amount)}</p>
                    <p className="text-xs text-amber-600">Due today</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Quick Stats</h3>
          <div className="space-y-3">
            {[
              { label: 'Total Customers', value: kpis.totalCustomers || 0 },
              { label: 'Pending KYC', value: kpis.pendingKyc || 0, warn: true },
              { label: 'Pending Applications', value: kpis.pendingApplications || 0, warn: true },
              { label: 'Overdue Accounts', value: kpis.overdueCount || 0, danger: true },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{s.label}</span>
                <span className={`font-semibold ${s.danger ? 'text-red-700' : s.warn && s.value > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Portfolio Mix</h3>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={pieData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                {pieData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div className="space-y-1.5 text-xs">
              {pieData.map((e: any) => (
                <div key={e.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: e.color }}></div>
                  <span className="text-gray-600">{e.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Monthly Collections</h3>
          {collectionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={collectionChartData} barSize={18}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="amount" fill="#BA7517" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No collections data yet</p>
          )}
        </div>
      </div>

      {/* Recent loans */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent Loans</h3>
          <button onClick={() => router.push('/loans')} className="text-xs text-amber-600 hover:underline">View all</button>
        </div>
        {recentLoans.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">No loans yet. <button onClick={() => router.push('/applications')} className="text-amber-600 hover:underline">Create your first loan →</button></p>
        ) : (
          <table className="w-full">
            <thead><tr>
              <th className="table-th">Loan ID</th><th className="table-th">Customer</th>
              <th className="table-th">Type</th><th className="table-th">Amount</th><th className="table-th">Status</th>
            </tr></thead>
            <tbody>
              {recentLoans.map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/loans?id=${l.id}`)}>
                  <td className="table-td font-mono text-xs text-amber-700">{l.loanNumber}</td>
                  <td className="table-td font-medium">{l.customer?.name}</td>
                  <td className="table-td"><span className={`badge badge-${l.loanType?.slug}`}>{l.loanType?.icon} {l.loanType?.name}</span></td>
                  <td className="table-td font-medium">{fmt(l.principalAmount)}</td>
                  <td className="table-td"><span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
