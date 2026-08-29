"use client";

import type { CSSProperties } from "react";

import { DayCell, type DayData } from "@/components/DayCell";
import { OrderBar } from "@/components/OrderBar";
import type { CalendarOrder, OrderSpan } from "@/lib/calendarSpans";

export type { CalendarOrder, OrderSpan };

export interface CalendarMonthData {
  days: DayData[];
  spans: OrderSpan[];
  weeks: number;
}


/**
 * Alokasikan lane anti-tabrakan per minggu tanpa batas jumlah lane.
 * Order yang overlap tanggal ditaruh di lane berbeda; bila semua lane
 * terpakai, dibuat lane baru. Kelebihan lane tidak ditumpuk — area batang
 * menjadi scrollable (lihat overlay di CalendarMonth).
 */
function laneBySpan(spans: OrderSpan[], weeks: number): number[] {
  // occ[weekIdx][lane][col] = terpakai?
  const occ: boolean[][][] = Array.from({ length: weeks }, () => []);

  const result = new Array<number>(spans.length).fill(-1);
  spans.forEach((span, idx) => {
    const weekIdx = span.week - 1;
    if (weekIdx < 0 || weekIdx >= weeks) return;
    const lanes = occ[weekIdx];

    let lane = 0;
    for (;; lane++) {
      if (!lanes[lane]) lanes[lane] = new Array<boolean>(7).fill(false);
      let free = true;
      for (let c = 0; c < span.colSpan; c++) {
        if (lanes[lane][span.colStart - 1 + c]) {
          free = false;
          break;
        }
      }
      if (free) break;
    }
    for (let c = 0; c < span.colSpan; c++) {
      lanes[lane][span.colStart - 1 + c] = true;
    }
    result[idx] = lane;
  });
  return result;
}

/**
 * Kalender bulan: tiap minggu = satu grid CSS 7-kolom berisi sel tanggal
 * (DayCell), plus overlay batang order (OrderBar) yang menumpang di atas sel
 * mulai di bawah header nomor hari. Overlay punya tinggi tetap mengikuti sel
 * dan scroll vertikal saat jumlah lane melebihi ruang — order banyak tidak
 * lagi ditumpuk.
 */
export function CalendarMonth({ data }: { data: CalendarMonthData }) {
  const { days, spans, weeks } = data;
  const lanes = laneBySpan(spans, weeks);

  const byWeek: { span: OrderSpan; lane: number }[][] = Array.from({ length: weeks }, () => []);
  spans.forEach((span, idx) => {
    const lane = lanes[idx];
    if (lane < 0) return;
    byWeek[span.week - 1].push({ span, lane });
  });

  return (
    <div className="flex flex-col gap-1.5">
      {byWeek.map((bars, w) => {
        const weekDays = days.slice(w * 7, w * 7 + 7);
        const cellStyle: CSSProperties = { gridColumn: "span 1", gridRow: 1 };

        return (
          <div
            key={w}
            className="relative grid grid-cols-7 gap-1.5"
          >
            {weekDays.map((d) => (
              <DayCell key={d.iso} data={d} style={cellStyle} />
            ))}
            {bars.length > 0 && (
              <div
                className="calendar-bar-overlay absolute inset-x-0 bottom-0 overflow-y-auto overscroll-contain pt-1 [scrollbar-width:thin]"
              >
                {/* Grid inner selaras dengan grid sel hari (7 kolom, gap sama) */}
                <div
                  className="calendar-bar-grid grid grid-cols-7 content-start gap-x-1.5"
                >
                  {bars.map(({ span, lane }, i) => (
                    <OrderBar key={`${span.orderId}-${i}`} span={span} gridRow={lane + 1} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
