# next-analytics-installer

Scaffolds consent-aware Microsoft Clarity and/or Google Analytics for a Next.js App Router project.

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

## Publishing

Before publishing, verify the package:

```bash
npm run check
```

Publish publicly:

```bash
npm login
npm publish --access public
```

If `next-analytics-installer` is already taken on npm, rename the package in `package.json` or use a scoped name like `@your-scope/next-analytics-installer` before publishing.
