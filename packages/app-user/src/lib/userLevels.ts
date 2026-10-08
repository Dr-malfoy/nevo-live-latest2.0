export const MAX_LEVEL = 100;

export interface LevelInfo {
  level: number;
  currentPoints: number;
  tierMin: number;
  tierNext: number;
  progress: number; // 0 to 100
  remaining: number;
}

export interface LevelMilestone {
  level: number;
  min: number;
  next: number;
}

/**
 * Generates progressive milestones for levels 1 to 100.
 * Scales smoothly from Level 1 (0 exp) to Level 100 (Max Level Limit).
 */
function generateMilestones(baseExp: number, growthFactor: number): LevelMilestone[] {
  const milestones: LevelMilestone[] = [];
  let currentMin = 0;

  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    if (lvl === MAX_LEVEL) {
      milestones.push({
        level: lvl,
        min: currentMin,
        next: Infinity,
      });
      break;
    }

    // Smooth progressive tier step
    const tierStep = Math.round(baseExp * Math.pow(lvl, growthFactor));
    const next = currentMin + tierStep;

    milestones.push({
      level: lvl,
      min: currentMin,
      next,
    });

    currentMin = next;
  }

  return milestones;
}

// 100-Level Ladders for Wealth Level (Diamonds) & Live Level (Live Stream Minutes)
export const WEALTH_MILESTONES: LevelMilestone[] = generateMilestones(100, 1.4);
export const LIVE_MILESTONES: LevelMilestone[] = generateMilestones(10, 1.35);

export function formatLiveTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }
  return `${hours}h ${remainingMins}m`;
}

export function calculateWealthLevel(diamonds: number = 0, fallbackLevel?: number): LevelInfo {
  const points = Math.max(0, diamonds || 0);

  let matched = WEALTH_MILESTONES[0];
  for (let i = WEALTH_MILESTONES.length - 1; i >= 0; i--) {
    if (points >= WEALTH_MILESTONES[i].min) {
      matched = WEALTH_MILESTONES[i];
      break;
    }
  }

  // Non-decreasing level guarantee: if user previously reached a higher level, never downgrade
  if (fallbackLevel && fallbackLevel > matched.level) {
    const cappedLvl = Math.min(MAX_LEVEL, Math.max(1, fallbackLevel));
    const fallbackMilestone = WEALTH_MILESTONES[cappedLvl - 1];
    if (fallbackMilestone) {
      matched = fallbackMilestone;
    }
  }

  const level = Math.min(MAX_LEVEL, Math.max(1, matched.level));

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      currentPoints: Math.max(points, matched.min),
      tierMin: matched.min,
      tierNext: matched.min,
      progress: 100,
      remaining: 0,
    };
  }

  const effectivePoints = Math.max(points, matched.min);
  const span = matched.next - matched.min;
  const currentInTier = Math.max(0, effectivePoints - matched.min);
  const progress = span > 0 ? Math.min(100, Math.max(0, (currentInTier / span) * 100)) : 100;
  const remaining = Math.max(0, matched.next - effectivePoints);

  return {
    level,
    currentPoints: effectivePoints,
    tierMin: matched.min,
    tierNext: matched.next,
    progress: Number(progress.toFixed(1)),
    remaining,
  };
}

/**
 * Live Level is calculated from the user's total live streaming time (in minutes).
 */
export function calculateLiveLevel(liveStreamMinutes: number = 0, fallbackLevel?: number): LevelInfo {
  const points = Math.max(0, liveStreamMinutes || 0);

  let matched = LIVE_MILESTONES[0];
  for (let i = LIVE_MILESTONES.length - 1; i >= 0; i--) {
    if (points >= LIVE_MILESTONES[i].min) {
      matched = LIVE_MILESTONES[i];
      break;
    }
  }

  if (fallbackLevel && fallbackLevel > matched.level) {
    const cappedLvl = Math.min(MAX_LEVEL, Math.max(1, fallbackLevel));
    const fallbackMilestone = LIVE_MILESTONES[cappedLvl - 1];
    if (fallbackMilestone) {
      matched = fallbackMilestone;
    }
  }

  const level = Math.min(MAX_LEVEL, Math.max(1, matched.level));

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      currentPoints: Math.max(points, matched.min),
      tierMin: matched.min,
      tierNext: matched.min,
      progress: 100,
      remaining: 0,
    };
  }

  const effectivePoints = Math.max(points, matched.min);
  const span = matched.next - matched.min;
  const currentInTier = Math.max(0, effectivePoints - matched.min);
  const progress = span > 0 ? Math.min(100, Math.max(0, (currentInTier / span) * 100)) : 100;
  const remaining = Math.max(0, matched.next - effectivePoints);

  return {
    level,
    currentPoints: effectivePoints,
    tierMin: matched.min,
    tierNext: matched.next,
    progress: Number(progress.toFixed(1)),
    remaining,
  };
}
