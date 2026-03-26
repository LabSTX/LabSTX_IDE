import React, { useMemo } from 'react';
import { ChevronDownIcon } from './Icons';

interface ContributionCalendarProps {
  data?: { date: string; count: number }[];
  year?: number;
}

const ContributionCalendar: React.FC<ContributionCalendarProps> = ({ data, year = 2026 }) => {
  // Generate data for the last year (staring from today)
  const contributionDataMap = useMemo(() => {
    const map: Record<string, number> = {};
    
    // Fill with zero for the last 371 days (53 weeks)
    const today = new Date();
    for (let i = 0; i < 371; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        map[dateStr] = 0;
    }

    // Merge real data
    if (data) {
        data.forEach(item => {
            if (map[item.date] !== undefined) {
                map[item.date] = item.count;
            }
        });
    }
    return map;
  }, [data]);

  // Get color based on count
  const getColor = (count: number) => {
    if (!count || count === 0) return 'bg-[#161b22]'; // empty
    if (count < 3) return 'bg-[#0e4429]';  // low
    if (count < 6) return 'bg-[#006d32]';  // medium
    if (count < 10) return 'bg-[#26a641]';  // high
    return 'bg-[#39d353]';                 // very high
  };

  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const days = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  const years = [2026];

  // Calculate the grid dates
  const gridDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    // We want 53 columns (weeks), 7 rows (days)
    // To align correctly, we find the "start" (371 days ago)
    for (let i = 370; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const totalContributions = useMemo(() => {
    return Object.values(contributionDataMap).reduce((a, b) => a + b, 0);
  }, [contributionDataMap]);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-black text-labstx-text uppercase tracking-tight">
            {totalContributions.toLocaleString()} contracts & actions in the last year
          </h3>
          <div className="flex items-center gap-1 text-[11px] font-bold text-labstx-muted cursor-pointer hover:text-labstx-orange transition-colors uppercase tracking-widest">
            Activity settings
            <ChevronDownIcon className="w-3 h-3" />
          </div>
        </div>

        <div className="bg-labstx-black border border-labstx-border rounded-xl p-4 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Months Header */}
            <div className="flex mb-2 text-[10px] font-black uppercase tracking-widest text-labstx-muted ml-8">
              {months.map((month, i) => (
                <div key={i} className="flex-1 text-left">{month}</div>
              ))}
            </div>

            <div className="flex gap-2">
               {/* Day Labels */}
               <div className="flex flex-col gap-[7px] text-[10px] font-black uppercase text-labstx-muted pt-1 w-6">
                {days.map((day, i) => (
                  <div key={i} className="h-[10px] leading-tight">{day}</div>
                ))}
              </div>

              {/* Grid of Squares */}
              <div className="flex-grow grid grid-flow-col grid-rows-7 gap-[3px]">
                {gridDates.map((date, i) => {
                  const count = contributionDataMap[date] || 0;
                  return (
                    <div
                      key={i}
                      className={`w-[10px] h-[10px] rounded-[1px] ${getColor(count)} transition-all hover:ring-1 hover:ring-white/20 cursor-pointer`}
                      title={`${count} activities on ${date}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Legend and Footer */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-[10px] text-labstx-muted hover:text-blue-400 cursor-pointer transition-colors">
                Learn how we count contributions
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-labstx-muted">Less</span>
                <div className="flex gap-[3px]">
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#161b22]" />
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#0e4429]" />
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#006d32]" />
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#26a641]" />
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#39d353]" />
                </div>
                <span className="text-[10px] text-labstx-muted">More</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Year Selector */}
      <div className="flex flex-col gap-1 pt-8">
        {years.map((y) => (
          <button
            key={y}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${y === year
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-labstx-muted hover:bg-labstx-panel hover:text-labstx-text'
              }`}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContributionCalendar;
