/**
 * 行程表解析：把 `名古屋 2/23-2/28` 這類純文字轉成日期區間，
 * 再依收據日期自動判定地區。
 */
import type { TripSegment } from "./types";

const RANGE_SEPARATORS = /\s*(?:-|~|–|—|〜|～|to|至|到)\s*/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 解析單一日期片段，支援 `2/23`、`2026/2/23`、`2026-02-23`、`2.23`。 */
function parseDatePart(raw: string, fallbackYear: number): string | null {
  const parts = raw.trim().split(/[/.\-年月日]/).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return null;
  let year = fallbackYear;
  let month: number;
  let day: number;
  if (parts.length === 3) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else {
    month = Number(parts[0]);
    day = Number(parts[1]);
  }
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * 解析行程表文字，每行一個地區。
 * 沒寫年份時用 `fallbackYear`；結束日早於開始日視為跨年，結束年 +1。
 */
export function parseTripSchedule(
  schedule: string,
  fallbackYear: number = new Date().getFullYear(),
): TripSegment[] {
  if (!schedule) return [];
  const segments: TripSegment[] = [];

  for (const line of schedule.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;

    // 地區與日期以空白分隔，日期在後半段
    const match = text.match(/^(.+?)[\s:：]+([\d/.\-年月日~–—〜～\sto至到]+)$/);
    if (!match) continue;
    const region = match[1].trim();
    const datePart = match[2].trim();
    if (!region) continue;

    const pieces = datePart.split(RANGE_SEPARATORS).filter(Boolean);
    const start = parseDatePart(pieces[0] ?? "", fallbackYear);
    if (!start) continue;
    let end = pieces.length > 1 ? parseDatePart(pieces[1], fallbackYear) : start;
    if (!end) end = start;
    if (end < start && pieces.length > 1) {
      // 跨年：例如 12/28-1/3
      const wrapped = parseDatePart(pieces[1], fallbackYear + 1);
      end = wrapped ?? end;
    }
    segments.push({ region, start, end });
  }

  return segments;
}

/** 依日期找出對應地區，找不到回傳空字串（讓使用者手動選）。 */
export function regionForDate(date: string, schedule: string): string {
  if (!date || !schedule) return "";
  const year = Number(date.slice(0, 4));
  if (!Number.isFinite(year)) return "";

  for (const fallbackYear of [year, year - 1]) {
    const segments = parseTripSchedule(schedule, fallbackYear);
    const hit = segments.find((s) => date >= s.start && date <= s.end);
    if (hit) return hit.region;
  }
  return "";
}

/** 行程表中出現過的所有地區（給下拉選單用）。 */
export function regionsFromSchedule(schedule: string): string[] {
  const names = parseTripSchedule(schedule).map((s) => s.region);
  return Array.from(new Set(names));
}
