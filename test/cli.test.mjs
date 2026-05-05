import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const cliPath = path.join(packageRoot, 'bin/cli.mjs')

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
}

function makeProject({ layout, lockfile } = {}) {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'next-analytics-installer-')
  )

  writeFile(
    path.join(projectRoot, 'package.json'),
    `${JSON.stringify({ dependencies: {} }, null, 2)}\n`
  )
  writeFile(path.join(projectRoot, 'src/components/.keep'), '')
  writeFile(
    path.join(projectRoot, 'src/app/layout.tsx'),
    layout ??
      `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
`
  )

  if (lockfile) {
    writeFile(path.join(projectRoot, lockfile), '')
  }

  return projectRoot
}

function runCli(projectRoot, args = []) {
  return execFileSync(
    process.execPath,
    [cliPath, 'init', '--project', projectRoot, '--yes', '--no-install', ...args],
    { encoding: 'utf8' }
  )
}

test('scaffolds Google Analytics without Clarity', (t) => {
  const projectRoot = makeProject({ lockfile: 'pnpm-lock.yaml' })
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))

  const output = runCli(projectRoot, ['--analytics', 'ga'])
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
  )
  const layout = fs.readFileSync(
    path.join(projectRoot, 'src/app/layout.tsx'),
    'utf8'
  )

  assert.match(output, /selected analytics: Google Analytics/)
  assert.match(output, /package manager: pnpm/)
  assert.equal(packageJson.dependencies.zustand, '^5.0.8')
  assert.equal(packageJson.dependencies['@microsoft/clarity'], undefined)
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, 'src/components/analytics/GoogleAnalytics.tsx')
    ),
    true
  )
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, 'src/components/analytics/ClarityConsent.tsx')
    ),
    false
  )
  assert.match(layout, /<GoogleAnalytics \/>/)
  assert.doesNotMatch(layout, /<ClarityProvider \/>/)
})

test('does not duplicate existing alias imports in layout', (t) => {
  const projectRoot = makeProject({
    layout: `import AnalyticsConsentProvider from '@/components/analytics/AnalyticsConsent'
import ClarityProvider from '@/components/analytics/ClarityConsent'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import { AnalyticsToggle } from '@/components/analytics/AnalyticsToggle'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsConsentProvider>
          {children}
          <ClarityProvider />
          <GoogleAnalytics />
          <AnalyticsToggle />
        </AnalyticsConsentProvider>
      </body>
    </html>
  )
}
`,
  })
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))

  runCli(projectRoot, ['--analytics', 'both'])
  const layout = fs.readFileSync(
    path.join(projectRoot, 'src/app/layout.tsx'),
    'utf8'
  )

  assert.equal(
    (layout.match(/from '\.\.\/components\/analytics/g) ?? []).length,
    0
  )
  assert.equal(
    (layout.match(/@\/components\/analytics\/AnalyticsConsent/g) ?? []).length,
    1
  )
  assert.equal(
    (layout.match(/@\/components\/analytics\/ClarityConsent/g) ?? []).length,
    1
  )
  assert.equal(
    (layout.match(/@\/components\/analytics\/GoogleAnalytics/g) ?? []).length,
    1
  )
  assert.equal(
    (layout.match(/@\/components\/analytics\/AnalyticsToggle/g) ?? []).length,
    1
  )
})
