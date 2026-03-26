import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  FileCode, 
  CheckCircle, 
  Globe, 
  Clock, 
  Shield, 
  ExternalLink,
  Code2,
  Box,
  Terminal,
  Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import { StatCard } from './StatsCards';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const StatisticsView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        const [summary, activity, feed, distribution, leaderboard, usage, explorer] = await Promise.all([
          fetch('/ide-api/stats/summary').then(r => r.json()),
          fetch('/ide-api/stats/activity').then(r => r.json()),
          fetch('/ide-api/stats/feed').then(r => r.json()),
          fetch('/ide-api/stats/distribution').then(r => r.json()),
          fetch('/ide-api/stats/leaderboard').then(r => r.json()),
          fetch('/ide-api/stats/usage').then(r => r.json()),
          fetch('/ide-api/stats/explorer').then(r => r.json())
        ]);

        setStats({
          summary,
          activity,
          feed,
          distribution,
          leaderboard,
          usage,
          explorer: explorer.contracts
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
    const interval = setInterval(fetchAllStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const networkData = Object.entries(stats.distribution.networks).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-8 space-y-8 bg-[#0E1116] min-h-screen text-slate-200">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Ecosystem Analytics</h1>
        <p className="text-slate-400">Real-time stats from the LabSTX development environment</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Contracts" 
          value={stats.summary.totalContracts.toLocaleString()}
          trend={stats.summary.totalContractsTrend}
          description="vs last period"
          icon={FileCode}
          color="blue"
        />
        <StatCard 
          title="Unique Developers" 
          value={stats.summary.uniqueDevelopers.toLocaleString()}
          trend={stats.summary.uniqueDevelopersTrend}
          description="wallets connected"
          icon={Users}
          color="purple"
        />
        <StatCard 
          title="Total Deployments" 
          value={stats.summary.totalDeployments.toLocaleString()}
          trend={stats.summary.totalDeploymentsTrend}
          description="across all networks"
          icon={Activity}
          color="emerald"
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats.summary.successRate}%`}
          trend={stats.summary.successRateTrend}
          description="compile & deploy"
          icon={CheckCircle}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-[#1A1D24] border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">IDE Activity Over Time</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Compilations</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Deployments</div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.activity.labels.map((l: string, i: number) => ({
                name: l,
                compilations: stats.activity.datasets[0].data[i],
                deployments: stats.activity.datasets[1].data[i]
              }))}>
                <defs>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDepl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                <XAxis dataKey="name" stroke="#718096" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#718096" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D24', border: '1px solid #2D3748', borderRadius: '8px' }}
                  itemStyle={{ color: '#E2E8F0' }}
                />
                <Area type="monotone" dataKey="compilations" stroke="#3B82F6" fillOpacity={1} fill="url(#colorComp)" />
                <Area type="monotone" dataKey="deployments" stroke="#10B981" fillOpacity={1} fill="url(#colorDepl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Feed */}
        <div className="bg-[#1A1D24] border border-slate-800 p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Live Feed</h3>
          <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {stats.feed.map((item: any, i: number) => (
              <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50">
                <div className={`p-2 rounded-lg shrink-0 ${item.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {item.action === 'deployed' ? <Globe size={18} /> : <Terminal size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="text-xs font-mono text-blue-400 truncate mr-2">{item.wallet}</span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{(new Date(item.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <span className="capitalize">{item.action}</span> <span className="font-semibold">{item.contract}</span>
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold tracking-tighter text-slate-500">{item.network}</span>
                    <span className={`text-[10px] font-bold ${item.status === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{item.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Network Distribution */}
        <div className="bg-[#1A1D24] border border-slate-800 p-6 rounded-2xl flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 w-full">Network Distribution</h3>
          <div className="h-[200px] w-full relative">
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white">21.5k</span>
                <span className="text-[10px] text-slate-500 uppercase">Total</span>
             </div>
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={networkData}
                  innerRadius={65}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {networkData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-2 mt-4">
            {networkData.map((n, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="capitalize text-slate-300">{n.name}</span>
                </div>
                <span className="font-semibold text-white">{n.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-[#1A1D24] border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Quality Metrics</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Compile Success Rate</span>
                <span className="font-bold text-white">{stats.distribution.quality.compileSuccess}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${stats.distribution.quality.compileSuccess}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Deploy Success Rate</span>
                <span className="font-bold text-white">{stats.distribution.quality.deploySuccess}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${stats.distribution.quality.deploySuccess}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase mb-1">Avg Compile</div>
                <div className="text-sm font-bold text-white">{stats.distribution.quality.avgCompileTime}</div>
              </div>
              <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase mb-1">Avg Deploy</div>
                <div className="text-sm font-bold text-white">{stats.distribution.quality.avgDeployTime}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Deployers */}
        <div className="bg-[#1A1D24] border border-slate-800 p-6 rounded-2xl flex flex-col">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Top Deployers</h3>
          <div className="space-y-4 flex-1">
            {stats.leaderboard.map((user: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {user.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-slate-300 truncate">{user.wallet}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">{user.count}</div>
                  <div className={`text-[10px] ${user.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {user.trend >= 0 ? '+' : ''}{user.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Templates */}
        <div className="bg-[#1A1D24] border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Popular Templates</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.usage.templates.slice(0, 5)}>
                <XAxis dataKey="name" hide />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1A1D24', border: '1px solid #2D3748', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-1">
             {stats.usage.templates.slice(0, 3).map((t: any, i: number) => (
               <div key={i} className="flex justify-between text-[10px]">
                 <span className="text-slate-400">{t.name}</span>
                 <span className="text-white font-mono">{t.count}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Recent Deployments Table */}
      <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Recent Deployments Explorer</h3>
          <button className="text-blue-400 text-xs font-medium flex items-center gap-1.5 hover:text-blue-300 transition-colors">
            View All Contracts <ExternalLink size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/30 text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Contract Name</th>
                <th className="px-6 py-4 font-bold">Deployer Wallet</th>
                <th className="px-6 py-4 font-bold">Network</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Gas Fee</th>
                <th className="px-6 py-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.explorer.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <Box size={16} />
                      </div>
                      <span className="text-sm font-medium text-slate-200">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-slate-400">{item.deployer}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                      item.network === 'mainnet' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {item.network}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400">{item.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-slate-300">{item.gas}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
