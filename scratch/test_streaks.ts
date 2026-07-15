import { getDayOfYear, isBitSet, setStreakCompletionBit, getCurrentStreak, streaksKey } from '../src/server/streakService.js';
import { Devvit } from '@devvit/public-api';

class MockRedis {
  private data = new Map<string, Buffer>();

  async bitfield(key: string, ...args: any[]) {
    const [action, type, offset, value] = args;
    if (action === "set" && type === "u1") {
      let buf = this.data.get(key) || Buffer.alloc(Math.ceil((offset + 1) / 8));
      if (buf.length * 8 <= offset) {
        const newBuf = Buffer.alloc(Math.ceil((offset + 1) / 8));
        buf.copy(newBuf);
        buf = newBuf;
      }
      
      const byteIndex = Math.floor(offset / 8);
      const bitWithinByte = offset % 8;
      if (value === 1) {
        buf[byteIndex] |= (1 << (7 - bitWithinByte));
      } else {
        buf[byteIndex] &= ~(1 << (7 - bitWithinByte));
      }
      this.data.set(key, buf);
    }
  }

  async getBuffer(key: string): Promise<Buffer | undefined> {
    return this.data.get(key);
  }
}

async function runTests() {
  const mockContext = {
    redis: new MockRedis()
  } as unknown as Devvit.Context;
  const userId = "t2_testuser";
  
  const today = new Date();
  const year = today.getUTCFullYear();
  const dayOfYear = getDayOfYear(today);

  console.log("Running Streak Logic Tests...");

  // 1. No plays
  let streak = await getCurrentStreak(mockContext, userId);
  console.assert(streak === 0, `Expected streak 0, got ${streak}`);

  // 2. Play today
  await setStreakCompletionBit(mockContext, userId, dayOfYear, year, true);
  streak = await getCurrentStreak(mockContext, userId);
  console.assert(streak === 1, `Expected streak 1 after today, got ${streak}`);

  // 3. Play yesterday
  await setStreakCompletionBit(mockContext, userId, dayOfYear - 1, year, true);
  streak = await getCurrentStreak(mockContext, userId);
  console.assert(streak === 2, `Expected streak 2, got ${streak}`);

  // 4. Missing day break
  await setStreakCompletionBit(mockContext, userId, dayOfYear - 3, year, true);
  streak = await getCurrentStreak(mockContext, userId);
  console.assert(streak === 2, `Expected streak 2 (break at -2), got ${streak}`);

  // 5. Cross-year logic (mocking today as Jan 1)
  const mockContextCrossYear = {
    redis: new MockRedis()
  } as unknown as Devvit.Context;

  // Let's pretend today is Jan 1st 2026. Prior year is 2025 (not leap year -> 365 days, indices 0-364).
  const origDate = global.Date;
  global.Date = class extends origDate {
    constructor(...args: any[]) {
      if (args.length === 0) return new origDate('2026-01-01T12:00:00Z');
      return new origDate(...args);
    }
  } as any;

  // We haven't played on Jan 1st 2026 yet.
  // We played Dec 31st 2025.
  await setStreakCompletionBit(mockContextCrossYear, userId, 364, 2025, true);
  
  streak = await getCurrentStreak(mockContextCrossYear, userId);
  console.assert(streak === 1, `Cross-year (played Dec 31, today Jan 1 unplayed): Expected 1, got ${streak}`);

  // We play today Jan 1st 2026.
  await setStreakCompletionBit(mockContextCrossYear, userId, 0, 2026, true);
  streak = await getCurrentStreak(mockContextCrossYear, userId);
  console.assert(streak === 2, `Cross-year (played Dec 31, today Jan 1 played): Expected 2, got ${streak}`);

  // We play Dec 30th 2025.
  await setStreakCompletionBit(mockContextCrossYear, userId, 363, 2025, true);
  streak = await getCurrentStreak(mockContextCrossYear, userId);
  console.assert(streak === 3, `Cross-year full: Expected 3, got ${streak}`);

  global.Date = origDate;
  
  console.log("All tests completed!");
}

runTests().catch(console.error);
