import { getSetting, setSetting } from '~/adapter/settings';

const KEY = 'recentMaps';
const MAX = 10;

export async function loadRecentMaps(): Promise<string[]> {
  return getSetting<string[]>(KEY, []);
}

export async function addRecentMap(path: string): Promise<string[]> {
  const current = await loadRecentMaps();
  const next = [path, ...current.filter((p) => p !== path)].slice(0, MAX);
  await setSetting(KEY, next);
  return next;
}

export async function clearRecentMaps(): Promise<void> {
  await setSetting(KEY, []);
}
