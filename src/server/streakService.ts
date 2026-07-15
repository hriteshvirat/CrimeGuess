import { redis } from '@devvit/web/server';

const STREAK_VERSION = 1;
export const streaksKey = (userId: string, year: number) => 
  `${STREAK_VERSION}:streaks:${userId}:${year}`;

export function getDayOfYear(date: Date): number {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86_400_000);
}

export function isBitSet(buffer: Buffer | null, bitIndex: number): boolean {
  if (!buffer || bitIndex < 0) return false;
  const byteIndex = Math.floor(bitIndex / 8);
  if (byteIndex >= buffer.length) return false;
  const bitWithinByte = bitIndex % 8;
  const byte = buffer[byteIndex];
  return (byte & (1 << (7 - bitWithinByte))) !== 0;
}

export async function setStreakCompletionBit(
  userId: string,
  dayIndex: number,
  year: number,
  completed: boolean
) {
  const key = streaksKey(userId, year);
  await redis.bitfield(key, "set", "u1", dayIndex, completed ? 1 : 0);
}

export async function getYearStreakBuffer(userId: string, year: number): Promise<Buffer | null> {
  const key = streaksKey(userId, year);
  const buffer = await redis.getBuffer(key);
  return buffer || null;
}

export async function getCurrentStreak(userId: string): Promise<number> {
  const today = new Date();
  const year = today.getUTCFullYear();
  const dayOfYear = getDayOfYear(today);
  
  const currentYearData = await getYearStreakBuffer(userId, year);
  const currentYearBuffer = currentYearData ?? null;
  
  let currentStreak = 0;
  let dayToStartChecking = dayOfYear;
  
  if (!isBitSet(currentYearBuffer, dayOfYear)) {
    dayToStartChecking = dayOfYear - 1;
  }
  
  for (let i = dayToStartChecking; i >= 0; i--) {
    if (isBitSet(currentYearBuffer, i)) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  // Handle cross-year streaks
  // Case A: It's Jan 1 and user hasn't played today -> continue into prior year directly
  if (dayToStartChecking < 0) {
    const priorYear = year - 1;
    const priorYearData = await getYearStreakBuffer(userId, priorYear);
    const priorYearBuffer = priorYearData ?? null;
    if (priorYearBuffer) {
      const isLeap = new Date(priorYear, 1, 29).getUTCDate() === 29;
      const lastDayOfPriorYear = isLeap ? 365 : 364;
      for (let i = lastDayOfPriorYear; i >= 0; i--) {
        if (isBitSet(priorYearBuffer, i)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  } 
  // Case B: Current year is fully contiguous from day 0 to dayToStartChecking
  else if (currentStreak > 0 && currentStreak === dayToStartChecking + 1) {
    const priorYear = year - 1;
    const priorYearData = await getYearStreakBuffer(userId, priorYear);
    const priorYearBuffer = priorYearData ?? null;
    if (priorYearBuffer) {
      const isLeap = new Date(priorYear, 1, 29).getUTCDate() === 29;
      const lastDayOfPriorYear = isLeap ? 365 : 364;
      for (let i = lastDayOfPriorYear; i >= 0; i--) {
        if (isBitSet(priorYearBuffer, i)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }
  
  return currentStreak;
}

export type RecordStreakCompletionInput = {
  userId: string;
  contentId: string;
  contentCreatedAt: Date;
  completed?: boolean;
  force?: boolean;
};

export async function recordStreakCompletion(
  input: RecordStreakCompletionInput
) {
  const { userId, contentCreatedAt, completed = true, force = false } = input;
  
  if (force !== true && completed === false) {
    return; // A failed/incomplete action must not clear a day that was already earned
  }
  
  const year = contentCreatedAt.getUTCFullYear();
  const dayIndex = getDayOfYear(contentCreatedAt);
  
  await setStreakCompletionBit(userId, dayIndex, year, completed);
}
