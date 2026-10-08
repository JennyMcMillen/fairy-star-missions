// POST /api/todos/close  { "id": "..." }  ->  completes the task in Todoist
export async function onRequestPost({ request, env }) {
  let id;
  try { id = String((await request.json()).id || ''); } catch (e) { id = ''; }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return json({ error: 'bad id' }, 400);
  const r = await fetch('https://api.todoist.com/api/v1/tasks/' + id + '/close', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.TODOIST_TOKEN }
  });
  return json({ ok: r.ok }, r.ok ? 200 : 502);
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
