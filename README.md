# primer-schemes-website

Developer documentation for the `primerschemes.pha4ge.org` frontend.

This is a SvelteKit static site that:
- fetches the upstream primer scheme catalog at runtime
- flattens nested scheme metadata into list rows
- provides full-text search + combinatorial filtering
- renders detailed scheme pages with `info.json`, bedfile, and reference assets

## Stack

- SvelteKit (client-side rendered)
- Vite
- Fuse.js (search)
- Plotly (detail page plots)
- Vitest (unit tests)
- Playwright (integration tests)
- `@sveltejs/adapter-static` (GitHub Pages build output)

## Runtime architecture

### Global app mode

`src/routes/+layout.js` sets:
- `ssr = false`
- `prerender = false`
- `trailingSlash = 'always'`

The app runs as a client-side SPA and fetches scheme data from GitHub raw URLs in the browser.

### Home page data flow (`src/routes/+page.svelte`)

1. Fetch upstream catalog from:
   - `index.json`
   - `aliases.json`
2. Flatten nested `primerschemes` object via `src/lib/flattenedSchemes.js`.
3. Build dynamic facet options (collections, authors, species, amplicon sizes).
4. Build Fuse index and execute query search.
5. Apply filters:
   - AND across facet groups
   - OR within most facet groups
   - collection filter currently behaves as AND across selected collections
6. Sync state into URL params (`q`, status flags, collections, sidebar facets, `pageNum`).
7. Paginate and render result rows via:
   - `src/routes/ResultsRow.svelte`
   - `src/routes/Pagination.svelte`

### Detail page data flow (`src/routes/detail/[schemename]/[ampliconsize]/[version]/+page.svelte`)

1. Fetch and flatten upstream `index.json` again.
2. Resolve route params to a single scheme record.
3. Fetch:
   - scheme `info.json`
   - primer bed file
   - reference FASTA
4. Render:
   - metadata sections
   - status pill
   - default or advanced amplicon plots
   - downloadable raw assets

## Data contracts

### `index.json` (upstream)

Expected shape (simplified):

```json
{
  "primerschemes": {
    "<schemeName>": {
      "<ampliconSize>": {
        "<version>": {
          "schemename": "...",
          "ampliconsize": 400,
          "schemeversion": "1.0.0",
          "status": "validated",
          "authors": ["..."],
          "species": ["..."],
          "collections": ["..."],
          "info_json_url": "https://...",
          "primer_bed_url": "https://...",
          "reference_fasta_url": "https://..."
        }
      }
    }
  }
}
```

### `aliases.json` (upstream)

Map of alias -> canonical `schemename`.

## Project layout

```text
src/
  lib/
    flattenedSchemes.js
    flattenedSchemes.test.js
    StatusPill.svelte
    assets/css/
  routes/
    +layout.js
    +layout.svelte
    +page.svelte
    ResultsRow.svelte
    Pagination.svelte
    detail/[schemename]/[ampliconsize]/[version]/
      +page.svelte
      DefaultAmpliconPlot.svelte
      AdvancedPlot.svelte
tests/
  test.js
.github/workflows/
  deploy.yml
```

## Local development

### Prerequisites

- Node.js 18+ (CI uses Node 18)
- npm

### Install

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

### Build + preview static output

```bash
npm run build
npm run preview
```

## Scripts

- `npm run dev` - local dev server
- `npm run build` - production static build to `build/`
- `npm run preview` - serve built output locally
- `npm run lint` - Prettier + ESLint
- `npm run format` - apply Prettier
- `npm run test` - integration + unit tests
- `npm run test:integration` - Playwright tests in `tests/`
- `npm run test:unit` - Vitest tests in `src/**/*.test.*`

## Testing approach

### Unit tests (Vitest)

- `src/lib/flattenedSchemes.test.js`
- validates flattening behavior and alias array initialization

### Integration tests (Playwright)

- `tests/test.js`
- mocks upstream network calls
- covers:
  - homepage render
  - query URL encoding
  - error states
  - detail route resolution
  - status/collection filter URL behavior
  - pagination behavior

## Styling system

Styling is mostly component-scoped Svelte CSS plus shared styles:
- `src/lib/assets/css/main.css`
- `src/lib/assets/css/pills.css`

Status badges use `src/lib/StatusPill.svelte` for consistency between list and detail pages.

## Deployment (GitHub Pages)

Deployment workflow: `.github/workflows/deploy.yml`

- Trigger: push to `main`
- Build job:
  - installs dependencies
  - runs `npm run build`
  - uploads `build/` artifact
- Deploy job:
  - publishes uploaded artifact with `actions/deploy-pages`

Svelte adapter config is in `svelte.config.js` and writes to `build/`.

## Performance notes

Current model is fully client-side and scales with upstream JSON size:
- initial load time depends on fetching/parsing full upstream catalog
- search/filter work runs in browser memory

For larger catalogs, consider:
- precomputed flattened JSON
- map-based alias joining
- worker-based filtering/search
- server-side search endpoint

## Contributor checklist

1. Keep URL-param behavior stable for filter/query state.
2. Run `npm run lint`.
3. Run `npm run test:unit`.
4. Run `npm run test:integration` when modifying route behavior.
5. Run `npm run build` before opening a PR.

## Playwright Integration Tests

Default mode (local preview web server managed by Playwright):

```bash
npm run test:integration
```

External mode (for restricted runners where binding localhost is blocked):

```bash
PLAYWRIGHT_BASE_URL=http://localhost:4173 npm run test:integration:external
```

Debug mode (verbose Playwright web server/API logs):

```bash
npm run test:integration:debug
```

Notes:
- `test:integration` starts `vite preview` on `http://127.0.0.1:4173` with fast-fail startup timeout.
- `test:integration:external` disables Playwright `webServer` and requires `PLAYWRIGHT_BASE_URL`.
- Preflight checks fail fast when external mode is enabled without `PLAYWRIGHT_BASE_URL`.
