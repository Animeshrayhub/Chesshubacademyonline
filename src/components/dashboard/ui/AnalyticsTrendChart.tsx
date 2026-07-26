'use client';

import React, { useState } from 'react';

interface ChartSeries {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface AnalyticsTrendChartProps {
  title: string;
  subtitle?: string;
  data: ChartSeries[];
  unit?: string;
  color?: 'primary' | 'accent' | 'purple' | 'emerald';
}

export default function AnalyticsTrendChart({
  title,
  subtitle,
  data,
  unit = '',
  color = 'primary',
}: AnalyticsTrendChartProps) {
  const [activeBar, setActiveBar] = useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const colorStyles = {
    primary: {
      bar: 'bg-gradient-to-t from-primary/80 to-primary hover:from-primary hover:to-primary-dark',
      activeBorder: 'border-primary',
      accentText: 'text-primary',
    },
    accent: {
      bar: 'bg-gradient-to-t from-amber-500/80 to-amber-400 hover:from-amber-500 hover:to-amber-300',
      activeBorder: 'border-amber-500',
      accentText: 'text-amber-600',
    },
    purple: {
      bar: 'bg-gradient-to-t from-purple-600/80 to-purple-500 hover:from-purple-600 hover:to-purple-400',
      activeBorder: 'border-purple-600',
      accentText: 'text-purple-600',
    },
    emerald: {
      bar: 'bg-gradient-to-t from-emerald-600/80 to-emerald-500 hover:from-emerald-600 hover:to-emerald-400',
      activeBorder: 'border-emerald-600',
      accentText: 'text-emerald-600',
    },
  }[color];

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h4 className="text-base font-bold text-text-primary">{title}</h4>
          {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary bg-surface-light px-3 py-1.5 rounded-xl border border-border">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Live Data Sync
          </span>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="pt-4 pb-2">
        <div className="h-48 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-100 pb-2">
          {data.map((item, idx) => {
            const heightPercent = Math.max(12, Math.round((item.value / maxValue) * 100));
            const isHovered = activeBar === idx;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-2 group relative cursor-pointer"
                onMouseEnter={() => setActiveBar(idx)}
                onMouseLeave={() => setActiveBar(null)}
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-10 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xl z-20 whitespace-nowrap animate-fade-in border border-slate-700">
                    {item.label}: {item.value.toLocaleString()} {unit}
                  </div>
                )}

                {/* Value Label above bar */}
                <span className={`text-[11px] font-bold transition-colors ${isHovered ? colorStyles.accentText : 'text-text-secondary'}`}>
                  {item.value}
                  {unit ? ` ${unit}` : ''}
                </span>

                {/* Bar */}
                <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl h-full flex items-end p-0.5">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 shadow-sm ${colorStyles.bar}`}
                  />
                </div>

                {/* Label X-axis */}
                <span className="text-[11px] font-semibold text-text-secondary group-hover:text-text-primary transition-colors mt-1">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
