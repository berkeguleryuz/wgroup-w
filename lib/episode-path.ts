/**
 * Pretty episode URLs: /app/watch/<title-slug>/s1-b2 (sezon 1, bölüm 2)
 * instead of exposing the episode's database cuid in the address bar.
 * Old id-based URLs keep working — the player page detects them and
 * redirects to the pretty form.
 */

type EpisodeNumbers = { seasonNumber: number; episodeNumber: number };

export function episodeSegment(ep: EpisodeNumbers): string {
  return `s${ep.seasonNumber}-b${ep.episodeNumber}`;
}

export function episodePath(slug: string, ep: EpisodeNumbers): string {
  return `/app/watch/${slug}/${episodeSegment(ep)}`;
}

export function parseEpisodeSegment(
  segment: string,
): { seasonNumber: number; episodeNumber: number } | null {
  const m = /^s(\d+)-b(\d+)$/.exec(segment);
  if (!m) return null;
  return { seasonNumber: Number(m[1]), episodeNumber: Number(m[2]) };
}
