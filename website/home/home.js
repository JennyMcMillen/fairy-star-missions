/* Family Home dashboard.
   Reads: today.json (written each morning by the digest run), /api/weather and /api/todos
   (Cloudflare Pages Functions, same origin), and Alba's stars straight from the
   Fairy Star Missions IndexedDB on this device (read only, never written). */
(function () {
  'use strict';

  var NIGHT_START = 21, NIGHT_END = 6;           // dim between 9pm and 6am
  var TODO_LIMIT = 5;
  var DB_NAME = 'fairy-star-missions-v1';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var state = { data: null, weather: null, todos: null, pendingClose: {}, stars: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function parseDay(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function mins(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function niceTime(hhmm) {
    var m = mins(hhmm), h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'pm' : 'am';
    h = h % 12; if (h === 0) h = 12;
    return h + (mm ? ':' + pad(mm) : '') + ap;
  }
  function getJSON(url, opts) {
    return fetch(url, Object.assign({ cache: 'no-store', credentials: 'same-origin' }, opts || {})).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  /* ---------- clock, date, night mode ---------- */
  function tick() {
    var now = new Date();
    $('clock').textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
    $('dayname').textContent = DAYS[now.getDay()];
    $('datetext').textContent = ordinal(now.getDate()) + ' ' + MONTHS[now.getMonth()];
    var h = now.getHours();
    document.body.classList.toggle('night', h >= NIGHT_START || h < NIGHT_END);
    renderCalendar();
    // reload once in the small hours so code updates and the new day land cleanly
    if (h === 3 && now.getMinutes() === 30) location.reload();
  }
  var wakeTimer;
  document.addEventListener('touchstart', wake, { passive: true });
  document.addEventListener('mousedown', wake);
  function wake() {
    if (!document.body.classList.contains('night')) return;
    document.body.classList.add('awake');
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(function () { document.body.classList.remove('awake'); }, 120000);
  }

  /* ---------- today.json ---------- */
  function loadData() {
    return getJSON('today.json').then(function (d) { state.data = d; renderAll(); })
      .catch(function () { if (!state.data) renderAll(); });
  }

  // If the morning update has not landed yet, yesterday's "tomorrow" is today's best guess.
  function dayBlocks() {
    var d = state.data, todayK = dayKey(new Date());
    if (!d) return { today: null, tomorrow: null, stale: true };
    if (d.date === todayK) return { today: d.today, tomorrow: d.tomorrow, stale: false };
    if (d.tomorrow && d.tomorrow.date === todayK) return { today: d.tomorrow, tomorrow: null, stale: true };
    return { today: null, tomorrow: null, stale: true };
  }

  function renderEvents(listEl, alldayEl, block, opts) {
    opts = opts || {};
    var now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
    alldayEl.innerHTML = (block && block.allDay || []).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('');
    var evs = (block && block.events) || [];
    if (!block) { listEl.innerHTML = '<li class="empty">Waiting for this morning&rsquo;s update</li>'; return null; }
    if (!evs.length) { listEl.innerHTML = '<li class="empty">' + (block.allDay && block.allDay.length ? 'Nothing else booked in' : 'Nothing booked in') + '</li>'; return null; }
    var next = null;
    listEl.innerHTML = evs.map(function (e) {
      var cls = '';
      if (opts.live) {
        var s = mins(e.start), en = e.end ? mins(e.end) : s + 30;
        if (e.endsLater) en = 24 * 60;
        if (en <= nowM) cls = 'past';
        else if (s <= nowM) cls = 'now';
        else if (!next) next = e;
      }
      var sub = e.endLabel ? e.endLabel : (e.end && !opts.compact ? 'to ' + niceTime(e.end) : '');
      return '<li class="' + cls + '"><span class="t">' + niceTime(e.start) + (sub ? '<small>' + esc(sub) + '</small>' : '') +
        '</span><span class="n">' + esc(e.title) + '</span></li>';
    }).join('');
    return next;
  }

  function renderCalendar() {
    var b = dayBlocks();
    var next = renderEvents($('today-events'), $('today-allday'), b.today, { live: true });
    var n = $('next');
    if (next) {
      var now = new Date(), diff = mins(next.start) - (now.getHours() * 60 + now.getMinutes());
      var h = Math.floor(diff / 60), m = diff % 60;
      n.textContent = 'Next in ' + (h ? h + 'h ' : '') + m + 'm';
    } else n.textContent = b.today ? 'Done for today' : '';

    var tmr = addDays(new Date(), 1);
    $('tomorrow-sub').textContent = DAYS[tmr.getDay()];
    renderEvents($('tomorrow-events'), $('tomorrow-allday'), b.tomorrow, { compact: true });
  }

  function renderTonight() {
    var d = state.data, el = $('tonight');
    var label = d && d.date === dayKey(new Date()) ? d.tonight : '';
    el.innerHTML = label ? 'Tonight: <b>' + esc(label) + '</b>' : '';
  }

  function renderMeals() {
    var d = state.data, el = $('meals');
    var m = d && d.date === dayKey(new Date()) ? d.meals : null;
    if (!m) { el.innerHTML = '<p class="muted">Meals appear after the morning update.</p>'; return; }
    var html = '<p class="meal-dinner"><small>Dinner</small>' + esc(m.dinner || 'Nothing written in for today') + '</p>';
    (m.dinnerNotes || []).forEach(function (t) { html += '<div class="meal-row"><b>Note</b><span>' + esc(t) + '</span></div>'; });
    var l = m.lunch || {};
    if (l.everyone) html += '<div class="meal-row"><b>Lunch</b><span>' + esc(l.everyone) + '</span></div>';
    if (l.jenny) html += '<div class="meal-row"><b>Jenny</b><span>' + esc(l.jenny) + '</span></div>';
    if (l.wayne) html += '<div class="meal-row"><b>Wayne</b><span>' + esc(l.wayne) + '</span></div>';
    if (m.defrost) html += '<p class="defrost">&#10052; Defrost: ' + esc(m.defrost) + '</p>';
    el.innerHTML = html;
  }

  function renderHeads() {
    var d = state.data, el = $('heads');
    var items = d && d.date === dayKey(new Date()) ? (d.headsUp || []) : [];
    el.innerHTML = items.length ? items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') : '<li class="muted">Nothing to flag</li>';
  }

  function renderWeekend() {
    var d = state.data, el = $('weekend');
    var todayK = dayKey(new Date()), tmrK = dayKey(addDays(new Date(), 1));
    var days = (d && d.weekend || []).filter(function (w) { return w.date > tmrK; });
    if (!days.length) {
      // Saturday or Sunday: show what weather is coming instead
      el.innerHTML = '<p class="muted">Enjoy the weekend</p>';
      return;
    }
    var diff = (parseDay(days[0].date) - parseDay(todayK)) / 864e5;
    $('h-weekend').textContent = diff > 6 ? 'Next weekend' : 'This weekend';
    el.innerHTML = days.map(function (w) {
      var wx = weatherFor(w.date);
      return '<div class="wk-day"><span class="d">' + SHORT[parseDay(w.date).getDay()] + '</span>' +
        '<span class="w">' + (wx ? wx.icon + ' ' + wx.max + '&deg;' : '') + '</span>' +
        '<span class="e">' + (w.items && w.items.length ? w.items.map(esc).join('<br>') : '<span class="muted">Nothing booked</span>') + '</span></div>';
    }).join('');
  }

  function renderUpdated() {
    var d = state.data, el = $('updated'), b = dayBlocks();
    if (!d) { el.textContent = 'No morning update yet'; el.className = 'updated stale'; return; }
    var g = new Date(d.generatedAt);
    var when = isNaN(g) ? '' : niceTime(pad(g.getHours()) + ':' + pad(g.getMinutes()));
    el.textContent = b.stale ? 'Morning update hasn’t arrived yet' + (when ? ' (last ' + SHORT[g.getDay()] + ' ' + when + ')' : '') : 'Updated ' + when;
    el.className = 'updated' + (b.stale ? ' stale' : '');
  }

  /* ---------- weather (Open-Meteo via /api/weather) ---------- */
  var WMO = [[0, '☀️', 'Sunny'], [2, '⛅', 'Sunny spells'], [3, '☁️', 'Cloudy'], [48, '🌫️', 'Fog'],
    [57, '🌦️', 'Drizzle'], [67, '🌧️', 'Rain'], [77, '❄️', 'Snow'], [82, '🌦️', 'Showers'],
    [86, '🌨️', 'Snow showers'], [99, '⛈️', 'Thunder']];
  function wmo(code) { for (var i = 0; i < WMO.length; i++) if (code <= WMO[i][0]) return WMO[i]; return WMO[WMO.length - 1]; }
  function weatherFor(k) {
    var w = state.weather; if (!w || !w.daily) return null;
    var i = w.daily.time.indexOf(k); if (i < 0) return null;
    var c = wmo(w.daily.weather_code[i]);
    return { icon: c[1], text: c[2], max: Math.round(w.daily.temperature_2m_max[i]), min: Math.round(w.daily.temperature_2m_min[i]), rain: w.daily.precipitation_probability_max ? w.daily.precipitation_probability_max[i] : null };
  }
  function loadWeather() {
    return getJSON('/api/weather').then(function (w) { state.weather = w; renderWeather(); renderWeekend(); }).catch(function () {});
  }
  function renderWeather() {
    var t = weatherFor(dayKey(new Date()));
    if (!t) return;
    $('w-icon').textContent = t.icon;
    $('w-temp').textContent = t.max + '°';
    $('w-range').textContent = t.text + ' · low ' + t.min + '°' + (t.rain != null && t.rain >= 30 ? ' · ' + t.rain + '% rain' : '');
  }

  /* ---------- to-dos (live Todoist via /api/todos) ---------- */
  function loadTodos() {
    return getJSON('/api/todos').then(function (r) { state.todos = r; renderTodos(); })
      .catch(function () { if (!state.todos) $('todo-list').innerHTML = '<li class="muted">Can&rsquo;t reach Todoist right now</li>'; });
  }
  function dueText(t) {
    if (!t.due || !t.due.date) return '';
    var k = t.due.date.slice(0, 10), todayK = dayKey(new Date());
    if (k < todayK) return { txt: 'Overdue', over: true };
    if (k === todayK) return { txt: 'Today' };
    if (k === dayKey(addDays(new Date(), 1))) return { txt: 'Tomorrow' };
    var d = parseDay(k);
    return { txt: SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) };
  }
  function renderTodos() {
    var r = state.todos, el = $('todo-list');
    if (!r) return;
    var list = (r.tasks || []).filter(function (t) { return !state.pendingClose[t.id] || state.pendingClose[t.id].shown; });
    if (!list.length) { el.innerHTML = '<li class="muted">All clear &#127793;</li>'; return; }
    var shown = list.slice(0, TODO_LIMIT);
    el.innerHTML = shown.map(function (t) {
      var due = dueText(t), p = 5 - (t.priority || 1);
      var done = state.pendingClose[t.id] ? ' done' : '';
      return '<li class="todo p' + p + done + '" data-id="' + esc(t.id) + '"><span class="tick"></span><span><span class="txt">' + esc(t.content) +
        '</span>' + (due ? '<span class="meta' + (due.over ? ' over' : '') + '">' + esc(due.txt) + '</span>' : '') + '</span></li>';
    }).join('') + (r.total > shown.length ? '<li class="todo-more">+' + (r.total - shown.length) + ' more in Life</li>' : '');
  }
  $('todo-list').addEventListener('click', function (e) {
    var li = e.target.closest ? e.target.closest('.todo') : null;
    if (!li) return;
    var id = li.getAttribute('data-id');
    if (state.pendingClose[id]) { undo(id); return; }
    var task = (state.todos.tasks || []).filter(function (t) { return t.id === id; })[0];
    li.classList.add('done');
    var timer = setTimeout(function () { commitClose(id); }, 5000);
    state.pendingClose[id] = { timer: timer, shown: true };
    toast('Done: ' + (task ? task.content : ''), function () { undo(id); });
  });
  function undo(id) {
    var p = state.pendingClose[id]; if (!p) return;
    clearTimeout(p.timer); delete state.pendingClose[id]; hideToast(); renderTodos();
  }
  function commitClose(id) {
    var p = state.pendingClose[id]; if (!p) return;
    p.shown = false; hideToast(); renderTodos();
    getJSON('/api/todos/close', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) })
      .then(function () { delete state.pendingClose[id]; return loadTodos(); })
      .catch(function () { delete state.pendingClose[id]; renderTodos(); toast('Couldn’t tick that off. Try again in a moment.'); });
  }

  var toastTimer;
  function toast(msg, onUndo) {
    var t = $('toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (onUndo ? '<button type="button">Undo</button>' : '');
    if (onUndo) t.querySelector('button').onclick = onUndo;
    t.classList.add('on'); clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, onUndo ? 5000 : 3500);
  }
  function hideToast() { $('toast').classList.remove('on'); }

  /* ---------- Alba's stars (read only from Fairy Star Missions) ---------- */
  function readStars() {
    return new Promise(function (resolve) {
      if (!window.indexedDB) return resolve(null);
      var created = false, req;
      try { req = indexedDB.open(DB_NAME); } catch (e) { return resolve(null); }
      // If the app has never run on this device, do NOT create an empty database.
      req.onupgradeneeded = function () { created = true; try { req.transaction.abort(); } catch (e) {} };
      req.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); resolve(created ? 'missing' : null); };
      req.onblocked = function () { resolve(null); };
      req.onsuccess = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('state')) { db.close(); return resolve('missing'); }
        var g = db.transaction('state', 'readonly').objectStore('state').get('main');
        g.onsuccess = function () { db.close(); resolve(g.result || 'missing'); };
        g.onerror = function () { db.close(); resolve(null); };
      };
    });
  }
  function loadStars() {
    return readStars().then(function (s) { state.stars = s; renderStars(); });
  }
  function renderStars() {
    var s = state.stars, E = window.FairyEngine;
    var bal = $('star-balance'), td = $('star-today'), goal = $('star-goal');
    if (s === 'missing') { bal.textContent = '0'; td.innerHTML = ''; goal.textContent = 'Open Fairy Stars on this iPad to get started'; return; }
    if (!s || !E) { bal.textContent = '–'; return; }
    var balance = 0, today = 0, waiting = 0, k = dayKey(new Date());
    try { balance = E.balance(s); } catch (e) { balance = 0; }
    (s.ledger || []).forEach(function (x) { if (x.day === k && x.collected) today += x.stars; });
    try { waiting = E.pendingStars(s, k) || 0; } catch (e) { waiting = 0; }
    bal.textContent = balance;
    td.innerHTML = (today ? '<b>+' + today + '</b> today' : 'None yet today') + (waiting ? '<br>' + waiting + ' waiting for bedtime' : '');
    var pins = (s.pins || []).map(function (id) { return (s.rewards || []).filter(function (r) { return r.id === id; })[0]; }).filter(Boolean);
    var target = pins.filter(function (r) { return r.price > balance; }).sort(function (a, b) { return a.price - b.price; })[0] || pins[0];
    if (!target) { goal.textContent = 'Pick a goal in the fairy market'; return; }
    var gap = Math.max(0, target.price - balance), pct = Math.min(100, Math.round(balance / target.price * 100));
    goal.innerHTML = (gap ? gap + ' more until <b>' + esc(target.name) + '</b>' : '<b>' + esc(target.name) + '</b> is ready to claim!') +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>';
  }

  /* ---------- wiring ---------- */
  function renderAll() {
    renderCalendar(); renderTonight(); renderMeals(); renderHeads(); renderWeekend(); renderUpdated(); renderWeather();
  }
  function refreshVisible() { loadTodos(); loadStars(); }

  tick();
  setInterval(tick, 20000);
  loadData(); setInterval(loadData, 10 * 60000);
  loadWeather(); setInterval(loadWeather, 30 * 60000);
  loadTodos(); setInterval(loadTodos, 60000);
  window.addEventListener('load', loadStars);
  setInterval(loadStars, 120000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { refreshVisible(); loadData(); } });
  window.addEventListener('pageshow', refreshVisible);
})();
