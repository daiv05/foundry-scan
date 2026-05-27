# Frequently Asked Questions

---

## General

### Why does FoundryScan use copy-paste instead of calling LLM APIs directly?

**Accessibility and cost.** API access to frontier models requires a paid subscription or pay-per-token billing. By generating a prompt and asking you to paste it, FoundryScan works with:

- The free tier of any LLM (ChatGPT free, Claude free, Gemini free)
- Models you already pay for on a flat subscription
- Local models via Ollama, LM Studio, or any chat interface
- Future models we've never heard of - no integration code required

It also means **you decide which LLM to use** and aren't locked into one provider. The prompt is plain text; swap models any time.

An API integration mode may be added in the future as an opt-in feature for users who want full automation.

---

### What LLMs work best?

Any model capable of following structured JSON output instructions works.

The prompt instructs the model to output a specific JSON schema. If parsing fails, FoundryScan shows the error and lets you retry without re-running the collection.

---

### Why PocketBase?

**Zero-ops simplicity.** PocketBase is a single binary that bundles an HTTP API, an admin UI, real-time subscriptions, and SQLite under one roof - no separate database server to configure, no connection pooling, no migrations managed with a separate tool.

---

### How is data stored and what gets collected?

FoundryScan stores:

- **Scans** - configuration, status, generated prompt text, and the raw LLM response
- **Opportunities** - parsed opportunity cards including scores, evidence, notes, and your status tags
- **Raw collection data** - Reddit posts, HN threads, and Trends data used to build the prompt

Raw collection data is automatically deleted after **30 days** for scans stuck in `awaiting_llm_input` status. Everything else is kept until you manually delete or archive it.

No data leaves your machine unless you deploy to a public server. There are no analytics, no telemetry, and no external calls other than fetching data from the configured sources.

---

### Can I run multiple scans at the same time?

Yes. Each scan runs as an independent background task. Be aware that running several scans simultaneously multiplies network requests to Reddit and other sources - use reasonable `COLLECTOR_REQUEST_DELAY_MS` values to avoid rate-limiting.

---

### What happens if a data source fails during collection?

Individual source failures are **non-fatal**. If Reddit is rate-limited, or Product Hunt returns an error, the scan continues with the remaining sources and notes which ones failed in the scan status. The prompt is built from whatever data was successfully collected.

If **all** sources fail, the scan transitions to `failed` status with an error message.

There is also a **10-minute hard timeout**: if collection hasn't finished within 10 minutes (e.g. due to very slow responses or a hanging Playwright session), the scan is marked as failed automatically.

---

### How do I back up my data?

```bash
# Stop to ensure no writes in progress
docker compose stop pocketbase

# Copy the data directory
cp -r pb_data/ pb_data_backup_$(date +%Y%m%d)/

# Restart
docker compose start pocketbase
```

The `pb_data/` directory contains the full SQLite database. You can also use the PocketBase admin panel at `/_/` --> **Settings --> Export data** for a JSON export of all collections.

---

### How do I update to the latest version?

```bash
git pull origin main
docker compose build
docker compose up -d --force-recreate
```

If `pocketbase/pb_migrations/` has new files in the pull, rebuild PocketBase:

```bash
docker compose build pocketbase
docker compose up -d --force-recreate pocketbase
docker compose up -d --force-recreate backend
```

---

## Development

### How do I rebuild after adding a new PocketBase migration?

Migrations are baked into the PocketBase Docker image at build time (not applied at runtime from a mount). After adding a file to `pocketbase/pb_migrations/`:

```bash
docker compose build pocketbase
docker compose up -d --force-recreate pocketbase
# Re-auth the backend against the fresh PocketBase instance:
docker compose up -d --force-recreate backend
```

---

### How do I run a single service without rebuilding everything?

```bash
docker compose up -d --force-recreate backend    # restart only backend
docker compose up -d --force-recreate frontend   # restart only frontend
```

---

### How do I reset the database completely?

```bash
docker compose down
rm -rf pb_data/
docker compose up -d
```

This destroys all scans, opportunities, and settings. Back up first if needed.

---

### How do I run backend or frontend outside Docker for faster iteration?

**Backend:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
POCKETBASE_URL=http://localhost:7130 uvicorn app.main:app --reload --port 7120
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev -- --port 7110
```

Keep PocketBase running in Docker while developing the others:

```bash
docker compose up -d pocketbase
```

---

### The frontend build fails with a Next.js error. What should I check?

- TypeScript errors are treated as build failures. Run `npm run build` inside the frontend directory to see the full error output.
- If you added a new dependency, make sure `package.json` was updated and the image was rebuilt: `docker compose build frontend`.
- Incremental cache issues: `docker compose build --no-cache frontend`.

---

### Why are some Reddit posts missing from the collected data?

Reddit's public JSON API (`old.reddit.com/r/.../.json`) can return partial results or block requests if the delay between requests is too short. Try increasing `COLLECTOR_REQUEST_DELAY_MS` to `2000` or higher. Playwright fallback is used automatically when the API returns a non-2xx response or is detected as blocked.
