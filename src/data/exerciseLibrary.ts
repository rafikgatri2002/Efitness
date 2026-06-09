import rawLibrary from './exerciseLibrary.json';

/**
 * Static exercise library sourced from the public-domain free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, Unlicense). The JSON is bundled
 * for instant offline search; the start-position photo is lazy-loaded from a CDN.
 */
export type LibraryExercise = {
  id: string;
  name: string;
  equipment: string | null;
  category: string | null;
  muscles: string[];
  img: string | null;
};

const LIBRARY = rawLibrary as LibraryExercise[];

// jsDelivr mirror of the free-exercise-db `exercises/` image folder.
const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';

/** Full CDN URL for a library image path (the `img` field), or null. */
export function imageUrlFor(imgPath: string | null | undefined): string | null {
  return imgPath ? IMAGE_BASE + imgPath : null;
}

// Maps the app's muscle-group keys to the db's `primaryMuscles` values so that,
// when adding to a "chest" group, chest exercises surface first.
const MUSCLE_MAP: Record<string, string[]> = {
  chest: ['chest'],
  back: ['lats', 'middle back', 'lower back', 'traps', 'neck'],
  biceps: ['biceps', 'forearms'],
  triceps: ['triceps'],
  legs: ['quadriceps', 'hamstrings', 'calves', 'glutes', 'adductors', 'abductors'],
  shoulders: ['shoulders'],
  abs: ['abdominals'],
  cardio: []
};

function matchesMuscle(exercise: LibraryExercise, muscle: string | null): boolean {
  if (!muscle) return false;
  if (muscle === 'cardio') return exercise.category === 'cardio';
  const targets = MUSCLE_MAP[muscle];
  if (!targets || targets.length === 0) return false;
  return exercise.muscles.some((m) => targets.includes(m));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Search the library by name. Results favour exercises matching `muscle`, then
 * by how early the query appears in the name. With an empty query, returns the
 * exercises for the current muscle group as sensible defaults.
 */
export function searchExercises(
  query: string,
  muscle: string | null,
  limit = 30
): LibraryExercise[] {
  const q = norm(query);

  if (!q) {
    const forMuscle = LIBRARY.filter((e) => matchesMuscle(e, muscle));
    return forMuscle.slice(0, limit);
  }

  const terms = q.split(' ');
  const scored: { ex: LibraryExercise; score: number }[] = [];

  for (const ex of LIBRARY) {
    const name = norm(ex.name);
    // Every term must appear somewhere in the name.
    if (!terms.every((t) => name.includes(t))) continue;

    let score = 0;
    if (name === q) score += 100;
    if (name.startsWith(q)) score += 50;
    if (name.includes(q)) score += 20; // contiguous phrase match
    if (matchesMuscle(ex, muscle)) score += 10;
    score -= name.length * 0.01; // gently prefer shorter, more exact names
    scored.push({ ex, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.ex);
}
