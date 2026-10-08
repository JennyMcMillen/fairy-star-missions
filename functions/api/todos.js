// GET /api/todos  ->  { tasks: [...top-level Life tasks, ranked], total }
// Needs two Cloudflare environment variables (Settings > Variables and Secrets):
//   TODOIST_TOKEN      (secret)  Todoist > Settings > Integrations > Developer > API token
//   TODOIST_PROJECT_ID (plain)   6M7XxrqRp4X8CG2C  (the "Life" project)
const API = 'https://api.todoist.com/api/v1';

export async function onRequestGet({ env }) {
  if (!env.TODOIST_TOKEN) return json({ error: 'TODOIST_TOKEN not set' }, 500);
  const project = env.TODOIST_PROJECT_ID || '6M7XxrqRp4X8CG2C';
  let tasks = [], cursor = null, guard = 0;
  do {
    const url = new URL(API + '/tasks');
    url.searchParams.set('project_id', project);
    url.searchParams.set('limit', '200');
    if (cursor) url.searchParams.set('cursor', cursor);
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + env.TODOIST_TOKEN } });
    if (!r.ok) return json({ error: 'Todoist ' + r.status }, 502);
    const body = await r.json();
    const page = Array.isArray(body) ? body : (body.results || []);
    tasks = tasks.concat(page);
    cursor = Array.isArray(body) ? null : body.next_cursor;
  } while (cursor && ++guard < 10);

  // Top-level tasks only. Rank: priority (p1 first), then due date (soonest first, overdue included), undated last.
  const ranked = tasks
    .filter(t => !t.parent_id && !t.checked && !t.is_deleted)
    .map(t => ({ id: String(t.id), content: plain(t.content), order: t.child_order || 0, priority: t.priority || 1, due: t.due ? { date: t.due.date, recurring: !!t.due.is_recurring } : null }))
    .sort((a, b) => (b.priority - a.priority) ||
      ((a.due ? a.due.date : '9999') < (b.due ? b.due.date : '9999') ? -1 : (a.due ? a.due.date : '9999') > (b.due ? b.due.date : '9999') ? 1 : 0) ||
      (a.order - b.order));
  return json({ tasks: ranked.slice(0, 20), total: ranked.length });
}

// Todoist content is markdown: show link text only.
function plain(s) { return String(s || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, ''); }

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
