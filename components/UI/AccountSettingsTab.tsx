import React, { useEffect, useRef, useState } from 'react';
import { UserIcon, WalletIcon, GlobeIcon, ActivityIcon, BotIcon, RocketIcon, CheckCircleIcon, ShieldIcon, CodeIcon, ChevronRightIcon, ChevronDownIcon } from './Icons';
import ContributionCalendar from './ContributionCalendar';

import { Button } from './Button';
import { WalletConnection, DeployedContract } from '../../types';
import gsap from 'gsap';

interface AccountSettingsTabProps {
  wallet: WalletConnection;
  deployedContracts: DeployedContract[];
  onQuotaReached?: (reached: boolean) => void;
  onConnectWallet?: () => void;
}

interface RecentDeployment {
  id: string;
  name: string;
  timestamp: string;
  network: string;
  status: string;
}

interface ActivityData {
  date: string;
  count: number;
}

interface UserStats {
  totalTransactions: number;
  aiInteractions: number;
  aiQuotaLimit: number;
  recentDeployments: RecentDeployment[];
}

const AccountSettingsTab: React.FC<AccountSettingsTabProps> = ({ wallet, deployedContracts, onQuotaReached, onConnectWallet }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserStats = async () => {
    if (!wallet.address) return;
    setLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const [statsRes, activityRes] = await Promise.all([
        fetch(`${backendUrl}/ide-api/stats/user/${wallet.address}`),
        fetch(`${backendUrl}/ide-api/stats/user/${wallet.address}/activity`)
      ]);

      if (!statsRes.ok || !activityRes.ok) {
        const statsError = !statsRes.ok ? `Stats fetch failed: ${statsRes.statusText}` : '';
        const activityError = !activityRes.ok ? `Activity fetch failed: ${activityRes.statusText}` : '';
        throw new Error(`Failed to fetch user data: ${statsError} ${activityError}`);
      }

      const statsData: UserStats = await statsRes.json();
      const activityData = await activityRes.json();

      setStats(statsData);
      setActivity(activityData);

      // Check for quota reach
      if (statsData.aiInteractions >= statsData.aiQuotaLimit) {
        onQuotaReached?.(true);
      } else {
        onQuotaReached?.(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch user stats or activity:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, [wallet.address]);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.animate-in'),
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'all'
        }
      );
    }
  }, [loading]);

  const statsDataEntries = [
    { label: 'Deployed Contracts', value: deployedContracts.length, icon: RocketIcon, color: 'text-blue-500' },
    { label: 'Total Transactions', value: stats?.totalTransactions ?? (loading ? '...' : '0'), icon: ActivityIcon, color: 'text-emerald-500' },
    { label: 'AI Interactions', value: stats?.aiInteractions ?? (loading ? '...' : '0'), icon: BotIcon, color: 'text-indigo-500' },
    // { label: 'Network Status', value: wallet.network || 'Testnet', icon: GlobeIcon, color: 'text-orange-500' },
  ];

  const aiUsedPercent = stats ? Math.min(100, Math.round((stats.aiInteractions / stats.aiQuotaLimit) * 100)) : 0;

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto bg-labstx-black text-labstx-text selection:bg-labstx-orange/10 relative">
      <div className={`max-w-5xl mx-auto px-6 py-12 lg:py-16 transition-all duration-500 ${!wallet.connected ? 'blur-md pointer-events-none select-none opacity-50' : ''}`}>

        {/* Profile Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 animate-in">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-labstx-panel border-2 border-labstx-orange flex items-center justify-center shadow-neobrutal group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
                <UserIcon className="w-12 h-12 text-labstx-orange" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-labstx-black flex items-center justify-center" title="Online">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight uppercase">Account <span className="text-labstx-orange">Analytics</span></h1>
              <p className="text-labstx-muted text-sm mt-1 font-medium text-wrap max-w-md">
                Manage your developer profile, connections, and explore your IDE usage analytics
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={fetchUserStats}
              disabled={loading}
              className={loading ? 'opacity-70 cursor-not-allowed' : ''}
            >
              <ActivityIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </header>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16 animate-in">
          {statsDataEntries.map((stat, i) => (
            <div key={i} className="bg-labstx-panel rounded-xl p-5 border border-labstx-border hover:border-labstx-orange transition-all group shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-labstx-black border border-labstx-border group-hover:border-labstx-orange transition-colors`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-labstx-muted">Metric</span>
              </div>
              <div className="text-2xl font-mono font-bold text-labstx-text">
                {stat.value}
              </div>
              <div className="text-xs font-bold text-labstx-muted uppercase tracking-tight mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Sidebar Column */}
        <div className="grid grid-cols-1 lg:col-span-12 gap-12 animate-in">

          <div className="lg:col-span-5 space-y-12">
            {/* AI Subscription Status */}
            <section className="p-6 rounded-2xl bg-labstx-panel border border-labstx-border shadow-neobrutal-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <BotIcon className="w-24 h-24 -rotate-12 translate-x-4 -translate-y-4" />
              </div>
              <h3 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-wider">
                <BotIcon className="w-4 h-4 text-indigo-400" />
                AI Quota Status
              </h3>
              <div className="space-y-6 relative z-10">
                <div>
                  <div className="flex justify-between text-[11px] font-black uppercase mb-2">
                    <span className="text-labstx-muted">Ai credits</span>
                    <span className="text-labstx-text font-mono">
                      {stats?.aiInteractions ?? 0} / {stats?.aiQuotaLimit ?? 1000} req
                    </span>
                  </div>
                  <div className="w-full h-3 bg-labstx-black rounded-full border border-labstx-border p-[2px]">
                    <div
                      className="h-full bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all duration-1000"
                      style={{ width: `${aiUsedPercent}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-labstx-muted leading-relaxed font-medium">
                  You've used <strong className="text-labstx-text">{aiUsedPercent}%</strong> of your AI bandwidth.
                </p>
                <Button variant="primary" size="sm" className="w-full border-indigo-500 shadow-[4px_4px_0_0_rgba(99,102,241,1)] hover:bg-indigo-500 group">
                  Buy Credits
                </Button>
              </div>
            </section>

            {/* Deployed Contracts History */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black text-labstx-muted uppercase tracking-[0.2em]">Recent Deployments</h2>
                <Button variant="secondary" size="sm" className="text-[9px] h-6 px-2">View History</Button>
              </div>
              <div className="bg-labstx-panel rounded-xl border border-labstx-border divide-y divide-labstx-border/30 shadow-neobrutal-sm overflow-y-auto max-h-[400px]">
                {loading ? (
                  <div className="p-10 flex justify-center">
                    <div className="w-6 h-6 border-2 border-labstx-orange border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : stats?.recentDeployments && stats.recentDeployments.length > 0 ? (
                  stats.recentDeployments.map((deployment, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-labstx-black/40 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all group-hover:rotate-6">
                          <CheckCircleIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate uppercase tracking-tight group-hover:text-labstx-orange transition-colors">{deployment.name}</div>
                          <div className="text-[9px] font-mono text-labstx-muted uppercase">{new Date(deployment.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] font-black text-labstx-muted group-hover:text-labstx-orange transition-colors">
                          {deployment.network.toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          <span className="text-[8px] font-mono text-emerald-500/70 uppercase">{deployment.status}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 flex flex-col items-center justify-center text-center opacity-40">
                    <RocketIcon className="w-8 h-8 mb-3 animate-bounce" />
                    <p className="text-xs font-bold uppercase tracking-widest text-labstx-muted leading-loose">
                      No deployments yet.<br />Ready for takeoff?
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-7 space-y-12 hidden">
            {/* Contribution Calendar Section */}
            <section>
              <div className="flex items-center justify-between mb-6 ">
                <h2 className="text-xs font-black text-labstx-muted uppercase tracking-[0.2em]">Contracts Activity</h2>
                <div className="flex gap-2 hidden">
                  <select className="bg-labstx-black border border-labstx-border text-[10px] uppercase font-black px-2 py-1 rounded outline-none focus:border-labstx-orange transition-colors">
                    <option>All Contracts</option>
                    <option>Mainnet</option>
                    <option>Testnet</option>
                  </select>
                </div>
              </div>
              <div className="p-8 bg-labstx-panel rounded-2xl border border-labstx-border relative group overflow-hidden shadow-neobrutal-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-labstx-orange/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <ContributionCalendar data={activity} />
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-labstx-border flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-bold text-labstx-muted uppercase tracking-widest animate-in">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-labstx-orange" />
            LabSTX IDE Profile v1.2.5
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-labstx-text transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-labstx-text transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-labstx-text transition-colors">Bug Bounty</a>
          </div>
        </footer>

      </div>

      {!wallet.connected && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-labstx-black/30 backdrop-blur-[2px]">
          <div className="bg-labstx-panel border-2 border-labstx-orange p-10 rounded-3xl shadow-neobrutal flex flex-col items-center text-center max-w-sm animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-labstx-black rounded-2xl border-2 border-labstx-border flex items-center justify-center mb-6">
              <WalletIcon className="w-10 h-10 text-labstx-orange" />
            </div>
            <h2 className="text-2xl font-black uppercase mb-3 tracking-tight">Connect Wallet</h2>
            <p className="text-sm text-labstx-muted font-medium mb-8 leading-relaxed">
              To view your account analytics and deployment history, please connect your Stacks wallet.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={onConnectWallet}
              className="w-full py-4 shadow-[6px_6px_0_0_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettingsTab;
