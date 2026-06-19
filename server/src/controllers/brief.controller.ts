import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI situation briefs for the command floor. Given a proposed transfer, Claude
 * writes a terse two-sentence coordinator brief. Falls back to a deterministic
 * local brief when ANTHROPIC_API_KEY is not configured, so the UI always works.
 *
 * Set ANTHROPIC_API_KEY in the server environment to enable live Claude briefs.
 */

type RouteCtx = {
  fromOrg: string; fromCounty: string; toOrg: string; toCounty: string;
  item: string; qty: number; urgent: boolean; distanceKm: number; etaMin?: number | null;
};

const MODEL = 'claude-opus-4-8';
const cache = new Map<string, string>();
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const SYSTEM =
  'You are a logistics analyst in a Kenyan national medical-supply redistribution command centre. ' +
  'Given a single proposed facility-to-facility transfer, write a calm, specific two-sentence situation brief for the coordinator: ' +
  'what the gap is and why it matters, then the recommended action and its logistics. ' +
  'Be operational and concrete. No preamble, no headings, no bullet points — respond with only the two sentences.';

function fallbackBrief(c: RouteCtx): string {
  const u = c.urgent ? 'Urgent: ' : '';
  const eta = c.etaMin ? ` (~${Math.round(c.etaMin / 60)}h by road)` : '';
  return (
    `${u}${c.toOrg} in ${c.toCounty} has an outstanding shortfall of ${c.qty} units of ${c.item.toLowerCase()}, ` +
    `while ${c.fromOrg} in ${c.fromCounty} holds matching surplus. ` +
    `Recommend releasing ${c.qty} units along the ${c.distanceKm} km${eta} corridor, ${c.urgent ? 'prioritised ahead of routine transfers' : 'scheduled with the next dispatch'}, pending coordinator verification.`
  );
}

export async function getBrief(req: Request, res: Response) {
  const c = (req.body || {}) as RouteCtx;
  if (!c.toOrg || !c.fromOrg) return res.status(400).json({ error: 'missing route context' });

  const key = `${c.fromOrg}|${c.toOrg}|${c.item}|${c.qty}|${c.urgent}`;
  if (cache.has(key)) return res.json({ brief: cache.get(key), source: 'cache' });

  if (!client) {
    const brief = fallbackBrief(c);
    cache.set(key, brief);
    return res.json({ brief, source: 'fallback' });
  }

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 220,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content:
          `Transfer under review:\n` +
          `- Need: ${c.toOrg} (${c.toCounty} County) is short ${c.qty} units of ${c.item}${c.urgent ? ' — flagged URGENT' : ''}.\n` +
          `- Source: ${c.fromOrg} (${c.fromCounty} County) holds compatible surplus.\n` +
          `- Route: ${c.distanceKm} km${c.etaMin ? `, ETA ~${c.etaMin} min by road` : ''}.\n` +
          `Write the two-sentence brief now.`,
      }],
    });
    const text = msg.content.filter((b) => b.type === 'text').map((b: any) => b.text).join(' ').trim();
    const brief = text || fallbackBrief(c);
    cache.set(key, brief);
    res.json({ brief, source: 'claude' });
  } catch (err: any) {
    console.error('[brief] error:', err?.message || err);
    const brief = fallbackBrief(c);
    cache.set(key, brief);
    res.json({ brief, source: 'fallback' });
  }
}
