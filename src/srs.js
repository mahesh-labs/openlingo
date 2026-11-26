/**
 * Spaced Repetition Scheduler (SM-2 / FSRS-inspired lightweight engine).
 * Tracks each syllabus item by its permanent `id` so course edits preserve learner history.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const RATINGS = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4
};

export function createCardState(itemId) {
  return {
    id: itemId,
    reps: 0,
    lapses: 0,
    intervalDays: 0,
    ease: 2.5,
    dueAt: Date.now(),
    lastReviewedAt: null
  };
}

export function scheduleReview(state, rating, now = Date.now()) {
  const card = { ...createCardState(state.id), ...state };

  if (rating === RATINGS.AGAIN) {
    card.reps = 0;
    card.lapses += 1;
    card.intervalDays = 0;
    card.ease = Math.max(1.3, card.ease - 0.2);
    card.dueAt = now + 5 * 60 * 1000; // 5 minutes
  } else {
    if (card.reps === 0) {
      card.intervalDays = rating === RATINGS.HARD ? 0.5 : rating === RATINGS.GOOD ? 1 : 3;
    } else if (card.reps === 1) {
      card.intervalDays = rating === RATINGS.HARD ? 2 : rating === RATINGS.GOOD ? 4 : 7;
    } else {
      const modifier = rating === RATINGS.HARD ? 0.8 : rating === RATINGS.EASY ? 1.3 : 1.0;
      card.intervalDays = Math.max(1, Math.round(card.intervalDays * card.ease * modifier));
    }

    card.reps += 1;
    if (rating === RATINGS.HARD) card.ease = Math.max(1.3, card.ease - 0.15);
    if (rating === RATINGS.EASY) card.ease = Math.min(3.0, card.ease + 0.15);
    card.dueAt = now + card.intervalDays * DAY_MS;
  }

  card.lastReviewedAt = now;
  return card;
}

export function formatIntervalLabel(state, rating) {
  const next = scheduleReview(state, rating, 0);
  if (next.dueAt < DAY_MS) {
    const mins = Math.max(1, Math.round(next.dueAt / 60000));
    return mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
  }
  const days = Math.round(next.intervalDays);
  return `${days}d`;
}

export function isDue(state, now = Date.now()) {
  if (!state || !state.lastReviewedAt) return true;
  return state.dueAt <= now;
}
