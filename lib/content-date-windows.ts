const CONTENT_TIME_ZONE = "Europe/Berlin";

type CalendarDate = { year: number; month: number; day: number };
type CalendarDateTime = CalendarDate & {
  hour: number;
  minute: number;
  second: number;
};

export type ContentDateWindow = { start: Date; end: Date };
export type ContentDateWindows = {
  week: ContentDateWindow;
  month: ContentDateWindow;
};

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CONTENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function readPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = parts.find((part) => part.type === type)?.value;
  if (!value) throw new Error(`Missing ${type} from zoned date`);
  return Number(value);
}

function zonedParts(date: Date): CalendarDateTime {
  const parts = zonedFormatter.formatToParts(date);
  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour: readPart(parts, "hour"),
    minute: readPart(parts, "minute"),
    second: readPart(parts, "second"),
  };
}

function addCalendarDays(date: CalendarDate, amount: number): CalendarDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + amount),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function berlinMidnight(date: CalendarDate): Date {
  const targetProjection = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    0,
    0,
    0,
  );
  let guess = targetProjection;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(new Date(guess));
    const actualProjection = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    guess += targetProjection - actualProjection;
  }

  return new Date(guess);
}

export function getContentDateWindows(now = new Date()): ContentDateWindows {
  const current = zonedParts(now);
  const today = {
    year: current.year,
    month: current.month,
    day: current.day,
  };
  const weekday = new Date(
    Date.UTC(today.year, today.month - 1, today.day),
  ).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStartDate = addCalendarDays(today, -daysSinceMonday);
  const monthStartDate = { year: today.year, month: today.month, day: 1 };
  const nextMonthDate =
    today.month === 12
      ? { year: today.year + 1, month: 1, day: 1 }
      : { year: today.year, month: today.month + 1, day: 1 };

  return {
    week: {
      start: berlinMidnight(weekStartDate),
      end: berlinMidnight(addCalendarDays(weekStartDate, 7)),
    },
    month: {
      start: berlinMidnight(monthStartDate),
      end: berlinMidnight(nextMonthDate),
    },
  };
}

export function publishedAtWhere(window: ContentDateWindow) {
  return { publishedAt: { gte: window.start, lt: window.end } } as const;
}

export function isPublishedInWindow(
  publishedAt: Date | null,
  window: ContentDateWindow,
) {
  return (
    publishedAt !== null &&
    publishedAt.getTime() >= window.start.getTime() &&
    publishedAt.getTime() < window.end.getTime()
  );
}
