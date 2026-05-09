# next-analytics-installer

Scaffolds consent-aware Microsoft Clarity and/or Google Analytics for a Next.js App Router project.

The implementation now lives under `engine/`. The published CLI still works from the package root as `next-analytics-installer`.

## What it does

- interactively lets you install Microsoft Clarity, Google Analytics, or both
- adds `components/analytics` files (or `src/components/analytics`)
- creates or patches `proxy.ts` with analytics region cookie logic
- patches `src/app/layout.tsx` (or `app/layout.tsx`) to mount analytics providers/components
- detects `npm`, `pnpm`, `yarn`, or `bun` from `packageManager` and lockfiles
- adds only the dependencies required for the selected providers

## Usage

After publishing, run it with `npx`:

```bash
npx next-analytics-installer init
```

The default flow is interactive in a terminal. In non-interactive environments, it defaults to both providers and does not run dependency installation.

If you are working in the repository itself, the CLI source and templates are under `engine/`.

Examples:

```bash
npx next-analytics-installer init --project ./frontend --force
npx next-analytics-installer init --analytics ga --project ./frontend
npx next-analytics-installer init --analytics clarity --package-manager pnpm --install
```

- `--project`: target Next.js project directory
- `--analytics`: `clarity`, `ga`, or `both`
- `--package-manager`: override detected `npm`, `pnpm`, `yarn`, or `bun`
- `--install`: run `<package-manager> install` after editing `package.json`
- `--no-install`: never run dependency installation
- `--force`: overwrite existing analytics folder files
- `--no-layout`: skip patching `app/layout.tsx`
- `--no-proxy`: skip creating or patching `proxy.ts`
- `--yes`: skip prompts and use defaults

## Environment variables

Set these in your app:

```bash
NEXT_PUBLIC_CLARITY_PROJECT_ID=your_clarity_id
NEXT_PUBLIC_GOOGLE_TAG=G-XXXXXXXXXX
```

The interactive flow can add the selected IDs to `.env.local` for you. Leave a value blank to skip it.

Optional toggles:

```bash
NEXT_PUBLIC_USE_GA=true
NEXT_PUBLIC_USE_ANALYTICS=true
NEXT_PUBLIC_ANALYTICS_REGION_ENDPOINT=/api/region
```


# Add more regions to show consent

if you want to show the consent screens for other regions than these ones : 

`Austria, Belgium, Bulgaria, Switzerland, Cyprus, Czechia, Germany, Denmark, Estonia, Spain, Finland, France, United Kingdom, Greece, Croatia, Hungary, Ireland, Iceland, Italy, Liechtenstein, Lithuania, Luxembourg, Latvia, Malta, Netherlands, Norway, Poland, Portugal, Romania, Sweden, Slovenia, Slovakia.`

You can follow the guide at : 

<p align="center" style="padding: 8px;"><a href="https://docs.byaditya.com/docs/dev/analytics/configs/regions"><img src="https://docs.byaditya.com/button/render?label=Dev&target=%2Fdocs%2Fdev%2Fanalytics%2Fconfigs%2Fregions&theme=dark&hideLabel=true" alt="Regions" /></a></p>