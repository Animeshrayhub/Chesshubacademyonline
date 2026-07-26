'use client';

import React from 'react';
import type { DbThemeProgress, ThemeBreakdownItem } from '@/types/homework-puzzles';
import { THEME_CONFIG } from '@/types/homework-puzzles';

interface ThemePerformanceChartProps {
  data: Array<DbThemeProgress | ThemeBreakdownItem>;
  title?: string;
}

export default function ThemePerformanceChart({ data, title = 'Tactical Theme Performance' }: ThemePerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border p-5 text-center">
        <h4 className="text-sm font-bold text-text-primary mb-2">{title}</h4>
        <p className="text-xs text-text-secondary italic">No tactical theme data collected yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-text-primary">{title}</h4>
        <span className="text-xs text-text-secondary">{data.length} themes tracked</span>
      </div>

      <div className="space-y-3">
        {data.map((item, idx) => {
          const themeKey = 'theme' in item ? item.theme : '';
          const config   = THEME_CONFIG[themeKey] ?? { label: themeKey || 'Tactics', emoji: '♟️', color: '#3b82f6' };
          const accuracy = 'accuracy' in item ? Number(item.accuracy) : 0;
          const total    = 'total_assigned' in item ? item.total_assigned : ('totalAttempts' in item ? item.totalAttempts : 0);
          const solved   = 'total_solved' in item ? item.total_solved : ('solved' in item ? item.solved : 0);

          let barColor = 'bg-emerald-500';
          if (accuracy < 60) barColor = 'bg-red-500';
          else if (accuracy < 80) barColor = 'bg-amber-500';

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-text-primary font-bold">
                  <span>{config.emoji}</span>
                  <span>{config.label}</span>
                </span>
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="text-[11px]">{solved}/{total} solved</span>
                  <span className={`font-bold font-mono text-xs ${accuracy >= 80 ? 'text-emerald-600' : accuracy < 60 ? 'text-red-600' : 'text-amber-600'}`}>
                    {accuracy}%
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(100, Math.max(0, accuracy))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
