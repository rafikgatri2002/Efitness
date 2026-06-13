import * as SecureStore from 'expo-secure-store';

// Public repo whose GitHub Releases host the installable APK. Unauthenticated
// GitHub API calls are limited to 60/hr per IP - plenty for one check per app
// launch. Any failure (rate limit, offline, no release yet) simply means "no
// prompt this launch"; the check must never get in the user's way.
const GITHUB_OWNER = 'IronLogEfitness';
const GITHUB_REPO = 'Efitness_frontend';

const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const DISMISSED_VERSION_KEY = 'ironlog.dismissedUpdateVersion';
const FETCH_TIMEOUT_MS = 8000;

export interface UpdateInfo {
  /** Release tag without the leading "v", e.g. "1.0.1". */
  version: string;
  /** The release page on GitHub (html_url) - the only URL ever shown to users. */
  releaseUrl: string;
}

const toSegments = (version: string): number[] =>
  version
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((segment) => {
      const value = parseInt(segment, 10);
      return Number.isFinite(value) ? value : 0;
    });

/**
 * Numeric segment-by-segment comparison ("1.0.10" beats "1.0.9", "1.0" equals
 * "1.0.0"). True only when candidate is strictly newer, so downgrades and
 * re-tags of the installed version never trigger a prompt.
 */
export function isNewerVersion(candidate: string, installed: string): boolean {
  const a = toSegments(candidate);
  const b = toSegments(installed);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) {
      return left > right;
    }
  }
  return false;
}

export async function fetchLatestRelease(): Promise<UpdateInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    const release = await response.json();
    const tag = typeof release?.tag_name === 'string' ? release.tag_name : '';
    const releaseUrl = typeof release?.html_url === 'string' ? release.html_url : '';
    if (!tag || !releaseUrl) {
      return null;
    }
    return { version: tag.replace(/^v/i, ''), releaseUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getDismissedVersion(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
}

export function setDismissedVersion(version: string): void {
  SecureStore.setItemAsync(DISMISSED_VERSION_KEY, version).catch(() => {});
}
