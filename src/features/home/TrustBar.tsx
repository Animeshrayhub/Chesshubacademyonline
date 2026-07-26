import Container from '@/components/ui/Container';

const TRUST_ITEMS = [
  {
    icon: (
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    ),
    value: '500+',
    label: 'Students Worldwide',
  },
  {
    icon: (
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    ),
    value: 'FIDE Rated',
    label: 'Certified Coaches',
    fill: true,
  },
  {
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    value: 'Live',
    label: 'Interactive Classes',
  },
  {
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
    value: '20+',
    label: 'Countries Served',
  },
  {
    icon: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </>
    ),
    value: '5.0 ★',
    label: 'Average Rating',
    fill: true,
  },
  {
    icon: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    value: 'Free Demo',
    label: 'No Commitment',
  },
];

export default function TrustBar() {
  return (
    <section
      className="py-6 bg-white border-y border-border"
      aria-label="Trust indicators"
    >
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 divide-x divide-border/60">
          {TRUST_ITEMS.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center px-4 py-2 gap-1.5"
            >
              <div className="w-8 h-8 flex items-center justify-center text-primary mb-1">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={item.fill ? 'currentColor' : 'none'}
                  stroke={item.fill ? 'none' : 'currentColor'}
                  strokeWidth="2"
                  className="text-accent"
                  aria-hidden="true"
                >
                  {item.icon}
                </svg>
              </div>
              <div className="font-heading font-bold text-text-primary text-base leading-tight">
                {item.value}
              </div>
              <div className="text-xs text-text-secondary leading-tight">{item.label}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
