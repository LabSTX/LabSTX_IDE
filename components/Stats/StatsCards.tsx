import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend: string | number;
  description: string;
  icon: LucideIcon;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, trend, description, icon: Icon, color = 'blue' }) => {
  const isPositive = typeof trend === 'string' ? !trend.startsWith('-') : trend >= 0;
  const trendColor = isPositive ? 'text-emerald-400' : 'text-rose-400';
  const bgColor = color === 'blue' ? 'bg-blue-500/10' : color === 'emerald' ? 'bg-emerald-500/10' : 'bg-purple-500/10';
  const iconColor = color === 'blue' ? 'text-blue-400' : color === 'emerald' ? 'text-emerald-400' : 'text-purple-400';

  return (
    <div className="bg-[#1A1D24] border border-slate-800/50 p-6 rounded-2xl hover:border-slate-700 transition-all group relative overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-32 h-32 ${bgColor} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={iconColor} size={24} />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {typeof trend === 'number' && trend > 0 ? `+${trend}` : trend}
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <p className="text-slate-500 text-xs">{description}</p>
      </div>
    </div>
  );
};
