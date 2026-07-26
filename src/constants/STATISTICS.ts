import type { Stat } from '@/types';

export const STATISTICS: Stat[] = [
  {
    id: 'students',
    value: 500,
    suffix: '+',
    label: 'Students Enrolled',
    description: 'Active learners from 20+ countries',
  },
  {
    id: 'lessons',
    value: 12000,
    suffix: '+',
    label: 'Chess Lessons Delivered',
    description: 'Live, structured online lessons',
  },
  {
    id: 'coaches',
    value: 8,
    suffix: '',
    label: 'FIDE Rated Coaches',
    description: 'Including Grandmasters & International Masters',
  },
  {
    id: 'countries',
    value: 20,
    suffix: '+',
    label: 'Countries Represented',
    description: 'A truly international chess community',
  },
];
