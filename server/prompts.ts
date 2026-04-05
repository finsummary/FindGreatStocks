/**
 * Prompt builders for SEO AI summaries (company, strategy, sector, comparison).
 * All prompts request short, factual output based only on provided data.
 */

const SYSTEM = `You are writing concise investor-style summaries for public company and screening SEO pages. Use only the provided data. Do not invent facts. Do not give financial advice. Be specific and neutral. Output valid JSON only.`;

export function companySummaryPrompt(payload: {
  name: string;
  sector?: string;
  industry?: string;
  marketCap?: number | string;
  revenueGrowth3Y?: number | string;
  revenueGrowth5Y?: number | string;
  fcfGrowth?: number | string;
  roic?: number | string;
  margins?: string;
  reverseDcfImpliedGrowth?: number | string;
  valuationGap?: string;
}): { system: string; user: string } {
  const user = `Generate a short summary for a company SEO page. Return JSON with keys: summary (90-140 words), standout (one short "what stands out" sentence), valuation_context (one short "valuation context" sentence).

Data:
- Company: ${payload.name}
- Sector: ${payload.sector ?? 'N/A'}
- Industry: ${payload.industry ?? 'N/A'}
- Market cap: ${payload.marketCap ?? 'N/A'}
- Revenue growth (3Y/5Y): ${payload.revenueGrowth3Y ?? 'N/A'} / ${payload.revenueGrowth5Y ?? 'N/A'}
- FCF growth: ${payload.fcfGrowth ?? 'N/A'}
- ROIC: ${payload.roic ?? 'N/A'}
- Margins: ${payload.margins ?? 'N/A'}
- Reverse DCF implied growth: ${payload.reverseDcfImpliedGrowth ?? 'N/A'}
- Valuation gap: ${payload.valuationGap ?? 'N/A'}`;
  return { system: SYSTEM, user };
}

export function strategySummaryPrompt(payload: {
  strategyName: string;
  description: string;
  topTickers: string[];
  count: number;
}): { system: string; user: string } {
  const user = `Generate a 2-3 sentence intro for a strategy SEO page. Return JSON with keys: summary (2-3 sentences explaining why this screen is useful for investors), key_qualification (one sentence on what qualifies companies).

Strategy: ${payload.strategyName}
Description: ${payload.description}
Sample tickers (top of list): ${payload.topTickers.slice(0, 10).join(', ')}
Total companies: ${payload.count}`;
  return { system: SYSTEM, user };
}

export function sectorSummaryPrompt(payload: {
  sectorName: string;
  companyCount: number;
  topNames: string[];
}): { system: string; user: string } {
  const user = `Generate a 2-3 sentence intro for a sector SEO page. Return JSON with keys: summary (2-3 sentences about the sector and why it matters for stock research).

Sector: ${payload.sectorName}
Companies in list: ${payload.companyCount}
Notable names: ${payload.topNames.slice(0, 8).join(', ')}`;
  return { system: SYSTEM, user };
}

export function comparisonSummaryPrompt(payload: {
  nameA: string;
  nameB: string;
  sectorA?: string;
  sectorB?: string;
  roicA?: number | string;
  roicB?: number | string;
  growthA?: number | string;
  growthB?: number | string;
  marginA?: number | string;
  marginB?: number | string;
}): { system: string; user: string } {
  const user = `Generate a short comparison summary for two companies. Return JSON with keys: summary (3-5 sentences comparing quality and growth), strength_a (one short strength of ${payload.nameA}), strength_b (one short strength of ${payload.nameB}).

${payload.nameA}: sector ${payload.sectorA ?? 'N/A'}, ROIC ${payload.roicA ?? 'N/A'}, growth ${payload.growthA ?? 'N/A'}, margin ${payload.marginA ?? 'N/A'}
${payload.nameB}: sector ${payload.sectorB ?? 'N/A'}, ROIC ${payload.roicB ?? 'N/A'}, growth ${payload.growthB ?? 'N/A'}, margin ${payload.marginB ?? 'N/A'}`;
  return { system: SYSTEM, user };
}

export function valuationPageSummaryPrompt(payload: {
  pageTitle: string;
  description: string;
  topTickers: string[];
  count: number;
}): { system: string; user: string } {
  const user = `Generate a 2-3 sentence intro for a valuation/ranking SEO page. Return JSON with keys: summary (2-3 sentences), interpretation (one sentence on how to use this list).

Page: ${payload.pageTitle}
Description: ${payload.description}
Sample tickers: ${payload.topTickers.slice(0, 10).join(', ')}
Total: ${payload.count}`;
  return { system: SYSTEM, user };
}
