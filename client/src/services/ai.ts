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
  const seed = JSON.stringify(stats) + '|' + (top.id ?? '') + '|' + (opts.context ?? '');

  const lead = snippetChoice(seed + ':lead', [
    'AI-assisted prototype brief. Use as guidance only; verify before coordination.',
    'Prototype AI summary using synthetic demo data. Confirm recommendations before acting.',
  ]);

  const urgency = (stats.urgentNeeds || 0) > 0
    ? `Immediate priorities: ${stats.urgentNeeds} urgent need${stats.urgentNeeds === 1 ? '' : 's'} detected.`
    : 'No immediate urgent needs detected in the current snapshot.';

  const supplyNote = (stats.availableSupplies || 0) > 0
    ? `Supply availability appears sufficient in ${stats.availableSupplies} open listings.`
    : 'Supply availability is low relative to visible needs.';

  const focal = top && top.title ? `Top candidate: ${top.title}.` : '';

  const action = snippetChoice(seed + ':action', [
    'Recommend short-haul transfers focusing on verified organizations and urgent flags.',
    'Recommend prioritizing nearest verified supply for urgent needs and staging coordination messages to owners.',
    'Recommend contacting the supply owner to confirm quantity and arrange safe pickup.',
  ]);

  return `${lead} ${urgency} ${supplyNote} ${focal} ${action} (AI-assisted prototype; synthetic demo data).`;
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
