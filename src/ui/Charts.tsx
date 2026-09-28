import { useEffect, useRef, useState, type ReactNode } from "react";

// Small, dependency-free SVG charts. One series in the accent (--chart-accent),
// context in the de-emphasis gray (--chart-muted): both validated for contrast
// against the page background in light and dark. Every chart has a table twin
// or its numbers in text, so a tooltip never gates a value.

export interface Datum {
  /** Stable key, e.g. an ISO day. */
  key: string;
  /** Axis/tooltip label, e.g. "Sep 27". */
  label: string;
  value: number;
}

const fmt = (n: number) => n.toLocaleString();

// 0, then 3–5 clean ticks (1, 2, 5 × 10^k steps) that cover max.
function ticks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Math.round(v));
  return out;
}

// A column with a 4px rounded data-end, square at the baseline.
function columnPath(x: number, w: number, top: number, base: number): string {
  const r = Math.min(4, w / 2, base - top);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

interface ColumnChartProps {
  data: Datum[];
  /** Names the series for screen readers and the tooltip, e.g. "pulls". */
  unit: string;
  height?: number;
}

/** Single-series column chart over time. Each column is a hover/focus target showing its value. */
export function ColumnChart({ data, unit, height = 180 }: ColumnChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const padL = 40;
  const padB = 24;
  const padT = 8;
  const plotW = Math.max(0, width - padL - 8);
  const plotH = height - padB - padT;
  const max = Math.max(0, ...data.map((d) => d.value));
  const yt = ticks(max);
  const top = yt[yt.length - 1] || 1;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2)); // ≤24px, and at least a 2px gap between neighbours
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  // Label roughly every 70px so dates never collide.
  const every = Math.max(1, Math.ceil(70 / Math.max(band, 1)));
  const hovered = active === null ? null : data[active];

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={`${unit} per day`}>
          {yt.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - 8} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={padL - 8} y={y(t)} className="chart-tick" textAnchor="end" dominantBaseline="middle">{fmt(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + band * i + band / 2;
            return (
              <g key={d.key}>
                {d.value > 0 && (
                  <path d={columnPath(cx - barW / 2, barW, y(d.value), y(0))} className={"chart-col" + (active === i ? " active" : "")} />
                )}
                {i % every === 0 && (
                  <text x={cx} y={height - 6} className="chart-tick" textAnchor="middle">{d.label}</text>
                )}
                {/* The hit target is the whole band, not just the painted column. */}
                <rect
                  x={padL + band * i}
                  y={padT}
                  width={band}
                  height={plotH}
                  className="chart-hit"
                  tabIndex={0}
                  aria-label={`${d.label}: ${fmt(d.value)} ${unit}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive((a) => (a === i ? null : a))}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hovered && active !== null && (
        <div
          className="chart-tooltip"
          role="status"
          style={{ left: Math.min(Math.max(padL + band * active + band / 2, 60), width - 60), top: Math.max(0, y(hovered.value) - 8) }}
        >
          <strong>{fmt(hovered.value)}</strong> <span className="muted">{unit} · {hovered.label}</span>
        </div>
      )}
    </div>
  );
}

/** A tiny column sparkline: history in the muted gray, the latest period in the accent. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const w = 4;
  const gap = 2;
  const h = 20;
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <svg width={values.length * (w + gap)} height={h} role="img" aria-label={`${label}: ${total} in total`} className="sparkline">
      {values.map((v, i) => {
        const bh = v > 0 ? Math.max(2, (v / max) * h) : 0;
        return bh > 0 ? (
          <rect key={i} x={i * (w + gap)} y={h - bh} width={w} height={bh} rx={1} className={i === values.length - 1 ? "spark-now" : "spark-past"} />
        ) : (
          <rect key={i} x={i * (w + gap)} y={h - 1} width={w} height={1} className="spark-zero" />
        );
      })}
    </svg>
  );
}

/** Stat tile: label, value (proportional figures), optional note and trend. */
export function StatTile({ label, value, note, trend, tone }: { label: string; value: ReactNode; note?: ReactNode; trend?: ReactNode; tone?: "danger" }) {
  return (
    <div className={"kpi" + (tone ? ` kpi-${tone}` : "")}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {note && <div className="kpi-note">{note}</div>}
      {trend && <div className="kpi-trend">{trend}</div>}
    </div>
  );
}

/** Fills missing days with 0 so a time axis is continuous. Days are YYYY-MM-DD (UTC). */
export function fillDays(rows: { day: string; pulls: number }[], days: number): Datum[] {
  const byDay = new Map(rows.map((r) => [r.day, r.pulls]));
  const out: Datum[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }), value: byDay.get(key) ?? 0 });
  }
  return out;
}
