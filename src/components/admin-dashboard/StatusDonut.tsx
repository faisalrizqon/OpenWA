const DONUT_SEGMENTS: { key: string; label: string; color: string }[] = [
  { key: "pending", label: "Perlu Konfirmasi", color: "oklch(0.75 0.15 70)" },
  { key: "booking", label: "Booking", color: "var(--chart-1)" },
  { key: "active", label: "Aktif", color: "oklch(0.65 0.17 150)" },
  { key: "late", label: "Terlambat", color: "var(--destructive)" },
  { key: "completed", label: "Selesai", color: "oklch(0.72 0.05 264)" },
];

/**
 * Donut chart SVG (stroke-based) untuk distribusi status order,
 * dengan total di tengah dan legend berisi jumlah + persentase.
 */
export function StatusDonut({ counts }: { counts: Record<string, number> }) {
  const segments = DONUT_SEGMENTS.map((s) => ({
    ...s,
    value: counts[s.key] ?? 0,
  }));
  const total = segments.reduce((a, s) => a + s.value, 0);

  const R = 46;
  const C = 2 * Math.PI * R;
  const GAP = total > 0 ? 2.5 : 0;

  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s, idx) => {
      const totalSoFar = segments.slice(0, idx).reduce((a, x) => a + x.value, 0);
      const frac = s.value / total;
      const start = (totalSoFar / total) * C;
      const visible = Math.max(0.75, frac * C - GAP);
      return (
        <circle
          key={s.key}
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={s.color}
          strokeWidth="15"
          strokeDasharray={`${visible} ${C - visible}`}
          strokeDashoffset={-start - GAP / 2}
          className="transition-all duration-300"
        />
      );
    });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--muted)" strokeWidth="15" />
          {arcs}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums tracking-tight">{total}</span>
          <span className="text-[11px] font-medium text-muted-foreground">total order</span>
        </div>
      </div>

      <ul className="w-full space-y-2.5 text-sm">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="font-medium">{s.label}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{s.value}</span> · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
