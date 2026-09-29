export const MAX_LEVEL = 100;

export interface LevelInfo {
  level: number;
  currentPoints: number;
  tierMin: number;
  tierNext: number;
  progress: number;
  remaining: number;
}

export interface LevelMilestone {
  level: number;
  min: number;
  next: number;
}

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

export const WEALTH_MILESTONES: LevelMilestone[] = generateMilestones(100, 1.4);
export const LIVE_MILESTONES: LevelMilestone[] = generateMilestones(100, 1.4);

export function calculateWealthLevel(diamonds: number = 0, fallbackLevel?: number): LevelInfo {
  const points = Math.max(0, diamonds || 0);

  let matched = WEALTH_MILESTONES[0];
  for (let i = WEALTH_MILESTONES.length - 1; i >= 0; i--) {
    if (points >= WEALTH_MILESTONES[i].min) {
      matched = WEALTH_MILESTONES[i];
      break;
    }
  }

  if (fallbackLevel && fallbackLevel > matched.level && points === 0) {
    const cappedLvl = Math.min(MAX_LEVEL, Math.max(1, fallbackLevel));
    matched = WEALTH_MILESTONES[cappedLvl - 1] || matched;
  }

  const level = Math.min(MAX_LEVEL, Math.max(1, matched.level));

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      currentPoints: points,
      tierMin: matched.min,
      tierNext: matched.min,
      progress: 100,
      remaining: 0,
    };
  }

  const span = matched.next - matched.min;
  const currentInTier = Math.max(0, points - matched.min);
  const progress = span > 0 ? Math.min(100, Math.max(0, (currentInTier / span) * 100)) : 100;
  const remaining = Math.max(0, matched.next - points);

  return {
    level,
    currentPoints: points,
    tierMin: matched.min,
    tierNext: matched.next,
    progress: Number(progress.toFixed(1)),
    remaining,
  };
}

export function calculateLiveLevel(coins: number = 0, fallbackLevel?: number): LevelInfo {
  const points = Math.max(0, coins || 0);

  let matched = LIVE_MILESTONES[0];
  for (let i = LIVE_MILESTONES.length - 1; i >= 0; i--) {
    if (points >= LIVE_MILESTONES[i].min) {
      matched = LIVE_MILESTONES[i];
      break;
    }
  }

  if (fallbackLevel && fallbackLevel > matched.level && points === 0) {
    const cappedLvl = Math.min(MAX_LEVEL, Math.max(1, fallbackLevel));
    matched = LIVE_MILESTONES[cappedLvl - 1] || matched;
  }

  const level = Math.min(MAX_LEVEL, Math.max(1, matched.level));

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      currentPoints: points,
      tierMin: matched.min,
      tierNext: matched.min,
      progress: 100,
      remaining: 0,
    };
  }

  const span = matched.next - matched.min;
  const currentInTier = Math.max(0, points - matched.min);
  const progress = span > 0 ? Math.min(100, Math.max(0, (currentInTier / span) * 100)) : 100;
  const remaining = Math.max(0, matched.next - points);

  return {
    level,
    currentPoints: points,
    tierMin: matched.min,
    tierNext: matched.next,
    progress: Number(progress.toFixed(1)),
    remaining,
  };
}
