// GET /api/weather -> Open-Meteo 7-day forecast for Penwortham (free, no key). Cached 30 minutes at the edge.
const URL_ = 'https://api.open-meteo.com/v1/forecast?latitude=53.75&longitude=-2.73' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&current=temperature_2m,weather_code&timezone=Europe%2FLondon&forecast_days=7';

export async function onRequestGet() {
  const r = await fetch(URL_, { cf: { cacheTtl: 1800, cacheEverything: true } });
  if (!r.ok) return new Response('{"error":"weather"}', { status: 502, headers: { 'Content-Type': 'application/json' } });
  return new Response(await r.text(), { headers: { 'Content-Type': 'application/json' } });
}
