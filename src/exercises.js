/**
 * Data-driven Exercise Generator.
 * Takes any course syllabus JSON and auto-generates interactive drills
 * (multiple choice, reverse translation, and transliteration typing).
 */

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDistractors(target, pool, count = 3) {
  const candidates = pool.filter((item) => item.id !== target.id);
  return shuffle(candidates).slice(0, Math.min(count, candidates.length));
}

export function generateLessonExercises(lesson, allCourseItems) {
  const pool = allCourseItems.length >= 4 ? allCourseItems : lesson.items;
  const exercises = [];

  // 1. Target -> Source multiple choice for every item
  lesson.items.forEach((item) => {
    const distractors = pickDistractors(item, pool, 3);
    const options = shuffle([item, ...distractors]).map((opt) => ({
      id: opt.id,
      label: opt.translation
    }));

    exercises.push({
      type: 'mc-to-source',
      item,
      promptLabel: 'Choose the English meaning',
      promptMain: item.term,
      promptSub: item.reading && item.reading !== item.term ? item.reading : '',
      promptHint: item.transliteration || '',
      correctId: item.id,
      options
    });
  });

  // 2. Source -> Target multiple choice for half of the items
  lesson.items.slice(0, Math.ceil(lesson.items.length / 2)).forEach((item) => {
    const distractors = pickDistractors(item, pool, 3);
    const options = shuffle([item, ...distractors]).map((opt) => ({
      id: opt.id,
      label: opt.term,
      sub: opt.transliteration || ''
    }));

    exercises.push({
      type: 'mc-to-target',
      item,
      promptLabel: 'Select the matching expression',
      promptMain: item.translation,
      promptSub: '',
      promptHint: '',
      correctId: item.id,
      options
    });
  });

  // 3. Typing / recall check (accepts target script, reading, or romaji)
  const typingSample = shuffle(lesson.items).slice(0, Math.min(2, lesson.items.length));
  typingSample.forEach((item) => {
    exercises.push({
      type: 'type-recall',
      item,
      promptLabel: 'Type the expression for',
      promptMain: item.translation,
      promptSub: item.tags?.length ? `Tag: ${item.tags.join(', ')}` : '',
      promptHint: item.transliteration || item.term,
      acceptedAnswers: [item.term, item.reading, item.transliteration]
        .filter(Boolean)
        .map((v) => normalizeAnswer(v))
    });
  });

  return exercises;
}

export function normalizeAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?¿¡'"\-\s]+/g, '')
    .trim();
}
