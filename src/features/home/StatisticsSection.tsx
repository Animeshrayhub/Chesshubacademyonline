'use client';

import { useEffect, useRef, useState } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import { STATISTICS } from '@/constants/STATISTICS';

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let startTime: number | null = null;
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * (target - startValue) + startValue));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [target, duration, active]);

  return count;
}

function StatCard({
  value,
  suffix,
  label,
  description,
  index,
  active,
}: {
  value: number;
  suffix: string;
  label: string;
  description: string;
  index: number;
  active: boolean;
}) {
  const count = useCountUp(value, 2000, active);
  const isGold = index % 2 === 1;

  return (
    <div className="text-center group">
      <div
        className={`text-5xl lg:text-6xl font-heading font-bold mb-2 ${
          isGold ? 'text-gradient-gold' : 'text-white'
        }`}
      >
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-lg font-semibold text-white mb-1">{label}</div>
      <div className="text-sm text-white/50 leading-relaxed max-w-[200px] mx-auto">
        {description}
      </div>
    </div>
  );
}

export default function StatisticsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="section-py bg-gradient-to-br from-primary-dark via-primary to-[#1a45b0] relative overflow-hidden"
      aria-label="Academy statistics"
    >
      {/* Chess pattern overlay */}
      <div className="absolute inset-0 chess-bg" aria-hidden="true" />

      <Container className="relative z-10">
        <SectionTitle
          eyebrow="By The Numbers"
          title="Results That"
          titleHighlight="Speak Loudly"
          subtitle="Our students don't just learn chess — they achieve measurable results."
          light
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {STATISTICS.map((stat, i) => (
            <StatCard
              key={stat.id}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              description={stat.description}
              index={i}
              active={active}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
