# FingerPlayer

## Run locally with Wrangler

From this directory:

```powershell
npm.cmd install
npm.cmd run build
npx.cmd wrangler dev
```

Open the local URL printed by Wrangler. The Worker serves the Vite-built site
from `dist` and handles the `/api/*` and `/health` routes.
The player defaults to Alpha (Movy); its server menu offers the desktop-style
Alpha/Bravo/Charlie choices (Movy, Vidfast, and VixSrc) plus Auto probing.

After changing the frontend, rerun the build and restart Wrangler before refreshing.
Optional local API settings can be placed in `.dev.vars` (for example,
`TMDB_API_KEY` or `OPENSUBTITLES_API_KEY`). TMDB metadata (logo, release date,
rating, and description) is fetched server-side; set `TMDB_API_KEY` in
`.dev.vars` to enable it locally. The API key is not sent to the browser.
