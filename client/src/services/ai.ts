// Deterministic, local "AI" helpers for the AI-assisted prototype.
// Purely client-side heuristics and templating — no external network calls.
type Stats = { urgentNeeds?: number; availableSupplies?: number; verifiedOrgs?: number; averageRadius?: number; recentActivity?: number };
function hashString(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function seededRandom(seed: string) {
  const h = hashString(seed || 'seed');
  return (h % 1000000) / 1000000;
}

function snippetChoice(seed: string, opts: string[]) {
  if (!opts || opts.length === 0) return '';
  const idx = Math.floor(seededRandom(seed) * opts.length) % opts.length;
  return opts[idx];
}

function generateCoordinatorBrief(opts: { stats?: Stats; topListing?: any; context?: string }) {
  const stats = opts.stats || {};
  const top = opts.topListing || {};

  const needs = stats.urgentNeeds || 0;
  const supply = stats.availableSupplies || 0;
  const km = stats.averageRadius;

  const needLine = needs > 0
    ? `${needs} urgent need${needs === 1 ? '' : 's'} flagged.`
    : 'No urgent needs in the current view.';

  const supplyLine = supply > 0 && top.title
    ? `${top.title} is the nearest available supply${km ? ` (~${km.toFixed(1)} km)` : ''}.`
    : supply > 0
      ? `${supply} supply listing${supply === 1 ? '' : 's'} available.`
      : '';

  const callToAction = needs > 0 && supply > 0
    ? 'Check the map or ranked matches before approving a transfer.'
    : needs > 0
      ? 'No supply currently visible — check listings.'
      : 'No active coordination needed right now.';

  return [needLine, supplyLine, callToAction].filter(Boolean).join(' ');
}

async function explainMatch(match: any) {
  // Lightweight, deterministic explanation using match fields
  const seed = JSON.stringify(match || {});
  const parts: string[] = [];
  parts.push('AI-assisted prototype explanation:');
  if (match.distance_km != null) parts.push(`Proximity contributes: ${Number(match.distance_km).toFixed(1)} km.`);
  if (match.is_urgent) parts.push('Urgency increases routing priority.');
  if (match.org_verified) parts.push('Posted by a verified organization (positive trust signal).');
  if (match.quantity != null) parts.push(`Reported quantity: ${match.quantity}.`);
  // Add a templated final sentence with deterministic flavor
  parts.push(snippetChoice(seed + ':close', [
    'Combined signals yield a strong priority score; confirm availability with the owner before transfer.',
    'Signals indicate a feasible short transfer; verify packaging and pickup windows.',
    'High-priority candidate; confirm transfer logistics before coordination.',
  ]));
  parts.push('(Synthetic demo data; verify before coordination.)');
  // Simulate async behaviour to keep caller patterns consistent
  return new Promise<string>(resolve => setTimeout(() => resolve(parts.join(' ')), 60));
}

function completenessCheck(fields: { title?: string; description?: string; quantity?: number; category?: string; lat?: string | number; lon?: string | number }) {
  const issues: string[] = [];
  const scoreFactors: number[] = [];
  if (!fields.title || String(fields.title).trim().length < 5) { issues.push('Title is short or missing. Use a clear, specific title.'); scoreFactors.push(0); } else scoreFactors.push(1);
  if (!fields.description || String(fields.description).trim().length < 12) { issues.push('Add a concise description with quantities and condition.'); scoreFactors.push(0); } else scoreFactors.push(1);
  if (!fields.quantity || Number(fields.quantity) <= 0) { issues.push('Specify a positive quantity.'); scoreFactors.push(0); } else scoreFactors.push(1);
  if (!fields.category || fields.category === 'other') { issues.push('Select a specific category for better matching.'); scoreFactors.push(0.5); } else scoreFactors.push(1);
  if (fields.lat == null || fields.lon == null || String(fields.lat).trim() === '' || String(fields.lon).trim() === '') { issues.push('Provide precise latitude/longitude for accurate routing.'); scoreFactors.push(0); } else scoreFactors.push(1);

  const raw = scoreFactors.reduce((a, b) => a + b, 0) / (scoreFactors.length || 1);
  const score = Math.round(raw * 100);
  const suggestions = issues.length ? issues : ['Listing looks complete. Consider verifying availability before coordination.'];
  return { score, suggestions };
}

export default {
  generateCoordinatorBrief,
  explainMatch,
  completenessCheck,
};
