# Family Home dashboard

A wall dashboard for the family iPad that lives on the same private site as Fairy Star Missions, so it can show Alba's stars directly.

## What is where

| Path | What it is |
|---|---|
| `website/home/` | The dashboard page (`/home/` on the site) |
| `website/home/today.json` | Written each morning by the daily digest run. Never commit real data while the repo is public. |
| `website/home/today.sample.json` | Placeholder showing the shape of `today.json` |
| `website/home-link.js` | Adds a small "Home" button to Fairy Star Missions |
| `functions/api/todos.js` | Live Todoist "Life" tasks, top level only, ranked by priority then due date |
| `functions/api/todos/close.js` | Ticks a task off in Todoist |
| `functions/api/weather.js` | Penwortham forecast from Open-Meteo (free, no key) |
| `functions/api/_middleware.js` | Refuses any API call that did not come through Cloudflare Access |

Alba's stars are read straight from the Fairy Star Missions storage on the iPad. The dashboard only reads; it never writes to her app.

## Go-live checklist

1. **Make this repo private.** GitHub > Settings > General > Danger Zone > Change visibility.
2. **Create the Cloudflare Pages project.** Workers & Pages > Create > Pages > Connect to Git > pick this repo.
   - Framework preset: None
   - Build command: leave empty
   - Build output directory: `website`
   - Root directory: leave empty (the `functions` folder must sit at the repo root)
3. **Add the variables.** Pages project > Settings > Variables and Secrets:
   - `TODOIST_TOKEN` as a Secret. Todoist > Settings > Integrations > Developer > copy API token.
   - `TODOIST_PROJECT_ID` = `6M7XxrqRp4X8CG2C`
   Then redeploy once so they take effect.
4. **Lock it down with Cloudflare Access.** Zero Trust > Access > Applications > Add > Self-hosted.
   - Domain: your `*.pages.dev` address (and add a second entry for preview URLs: `*.your-project.pages.dev`)
   - Policy: Allow, Emails: Jenny's and Wayne's addresses
   - Session duration: 1 month
5. **Set up the iPad.**
   - Settings > Display & Brightness > Auto-Lock > Never. Keep it plugged in.
   - In Safari open `https://<your-site>/home/`, sign in with the emailed code, then Share > Add to Home Screen.
   - Open Fairy Star Missions once from the same site. Restore Alba's backup from Wayne's iPad (Backups screen) so her stars carry over.
   - Optional: Settings > Accessibility > Guided Access, if the kids keep wandering off.
6. **Turn on the morning update** (ask Claude to add the step below to the Daily digest scheduled task).

## Morning update step (for the Daily digest scheduled task)

After the Slack and Alexa posts succeed, build `website/home/today.json` from the same data the digest already gathered and push it to `main`:

- `date`: today, `YYYY-MM-DD` (Europe/London). `generatedAt`: ISO timestamp with offset.
- `today` and `tomorrow`: `{ date, allDay: [titles], events: [{ start: "HH:MM", end: "HH:MM", title, endLabel?, endsLater? }] }`. Times converted to Europe/London. Deduplicate across all four calendars. Multi-day events: show on the start day with `endLabel` like "back Fri" and `endsLater: true`, and as an all-day chip on the following days.
- `weekend`: the next Saturday and Sunday after today, `[{ date, items: [short lines] }]`.
- `tonight`: the evening plan label, adjusted if someone is away.
- `meals`: `{ dinner, dinnerNotes: [], lunch: { jenny, wayne } on weekdays or { everyone } at weekends, defrost }` from the meal plan.
- `headsUp`: the same lines as the digest's Heads up.
- Always call Jenny's mum "Nanna". No em dashes.

The dashboard copes if this is late: until it lands it shows yesterday's "tomorrow" as today, with a note at the bottom.
