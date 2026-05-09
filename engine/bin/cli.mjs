#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const PROVIDER_LABELS = {
  clarity: 'Microsoft Clarity',
  ga: 'Google Analytics',
}

const PROVIDER_ALIASES = {
  all: 'both',
  both: 'both',
  clarity: 'clarity',
  ga: 'ga',
  google: 'ga',
  'google-analytics': 'ga',
}

const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun'])

const COMMON_DEPENDENCIES = {
  zustand: '^5.0.8',
}

const PROVIDER_DEPENDENCIES = {
  clarity: {
    '@microsoft/clarity': '^1.0.2',
  },
  ga: {},
}

const COMMON_TEMPLATE_FILES = [
  'AnalyticsConsent.tsx',
  'AnalyticsToggle.tsx',
  'AnalyticsPreferences.tsx',
  'local-traffic.ts',
  'store/analytics-consent.ts',
]

const PROVIDER_TEMPLATE_FILES = {
  clarity: ['ClarityConsent.tsx'],
  ga: ['GoogleAnalytics.tsx'],
}

const PROVIDER_LAYOUT_COMPONENTS = {
  clarity: {
    identifier: 'ClarityProvider',
    importStatement: (basePath) =>
      `import ClarityProvider from '${basePath}/ClarityConsent'`,
    element: '<ClarityProvider />',
  },
  ga: {
    identifier: 'GoogleAnalytics',
    importStatement: (basePath) =>
      `import GoogleAnalytics from '${basePath}/GoogleAnalytics'`,
    element: '<GoogleAnalytics />',
  },
}

const SHARED_LAYOUT_COMPONENTS = [
  {
    identifier: 'AnalyticsConsentProvider',
    importStatement: (basePath) =>
      `import AnalyticsConsentProvider from '${basePath}/AnalyticsConsent'`,
  },
  {
    identifier: 'AnalyticsToggle',
    importStatement: (basePath) =>
      `import { AnalyticsToggle } from '${basePath}/AnalyticsToggle'`,
    element: '<AnalyticsToggle />',
  },
]

const PROXY_HELPER_BLOCK = `const ANALYTICS_REGION_COOKIE = 'analytics-consent-region'\n\nconst CONSENT_REQUIRED_COUNTRIES = new Set([\n  'AT',\n  'BE',\n  'BG',\n  'CH',\n  'CY',\n  'CZ',\n  'DE',\n  'DK',\n  'EE',\n  'ES',\n  'FI',\n  'FR',\n  'GB',\n  'GR',\n  'HR',\n  'HU',\n  'IE',\n  'IS',\n  'IT',\n  'LI',\n  'LT',\n  'LU',\n  'LV',\n  'MT',\n  'NL',\n  'NO',\n  'PL',\n  'PT',\n  'RO',\n  'SE',\n  'SI',\n  'SK',\n])\n\nfunction getRequestCountry(req: NextRequest) {\n  const country =\n    req.headers.get('cf-ipcountry') ?? req.headers.get('x-vercel-ip-country')\n\n  return country?.trim().toUpperCase()\n}\n\nfunction getConsentRegion(req: NextRequest) {\n  const country = getRequestCountry(req)\n\n  if (!country || country === 'XX' || country === 'T1') {\n    return 'not-required'\n  }\n\n  return CONSENT_REQUIRED_COUNTRIES.has(country) ? 'required' : 'not-required'\n}\n`

function parseFlagValue(argv, index, name) {
  const value = argv[index]

  if (value.includes('=')) {
    return { value: value.slice(value.indexOf('=') + 1), nextIndex: index }
  }

  const next = argv[index + 1]
  if (!next) {
    throw new Error(`Missing value for ${name}`)
  }

  return { value: next, nextIndex: index + 1 }
}

function normalizeAnalyticsChoice(value) {
  const normalized = PROVIDER_ALIASES[value.trim().toLowerCase()]

  if (!normalized) {
    throw new Error(
      `Invalid analytics selection: ${value}. Use clarity, ga, or both.`
    )
  }

  return normalized
}

function parseArgs(argv) {
  const result = {
    command: 'init',
    project: process.cwd(),
    force: false,
    analytics: null,
    packageManager: null,
    install: null,
    layout: true,
    proxy: true,
    yes: false,
  }

  for (let i = 2; i < argv.length; i += 1) {
    const rawValue = argv[i]
    const [flagName] = rawValue.split('=')

    if (rawValue === 'init') {
      result.command = 'init'
      continue
    }

    if (rawValue === '--force') {
      result.force = true
      continue
    }

    if (rawValue === '--yes' || rawValue === '-y') {
      result.yes = true
      continue
    }

    if (rawValue === '--install') {
      result.install = true
      continue
    }

    if (rawValue === '--no-install') {
      result.install = false
      continue
    }

    if (rawValue === '--no-layout') {
      result.layout = false
      continue
    }

    if (rawValue === '--no-proxy') {
      result.proxy = false
      continue
    }

    if (flagName === '--project') {
      const parsed = parseFlagValue(argv, i, '--project')
      result.project = path.resolve(parsed.value)
      i = parsed.nextIndex
      continue
    }

    if (flagName === '--analytics' || flagName === '--providers') {
      const parsed = parseFlagValue(argv, i, flagName)
      result.analytics = normalizeAnalyticsChoice(parsed.value)
      i = parsed.nextIndex
      continue
    }

    if (flagName === '--package-manager') {
      const parsed = parseFlagValue(argv, i, '--package-manager')
      const packageManager = parsed.value.trim().toLowerCase()

      if (!PACKAGE_MANAGERS.has(packageManager)) {
        throw new Error(
          `Invalid package manager: ${parsed.value}. Use npm, pnpm, yarn, or bun.`
        )
      }

      result.packageManager = packageManager
      i = parsed.nextIndex
      continue
    }

    throw new Error(`Unknown argument: ${rawValue}`)
  }

  return result
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
}

function fileExists(filePath) {
  return fs.existsSync(filePath)
}

function resolveLayoutPath(projectRoot) {
  const candidates = [
    path.join(projectRoot, 'src/app/layout.tsx'),
    path.join(projectRoot, 'app/layout.tsx'),
  ]

  return candidates.find((candidate) => fileExists(candidate)) ?? null
}

function resolveAnalyticsTargetRoot(projectRoot) {
  const srcComponents = path.join(projectRoot, 'src/components')
  if (fileExists(srcComponents)) return srcComponents

  return path.join(projectRoot, 'components')
}

function selectedProvidersFromChoice(choice) {
  if (choice === 'both') return ['clarity', 'ga']

  return [choice]
}

function formatProviderLabels(selectedProviders) {
  return selectedProviders.map((provider) => PROVIDER_LABELS[provider]).join(', ')
}

function getRequiredDependencies(selectedProviders) {
  const dependencies = { ...COMMON_DEPENDENCIES }

  for (const provider of selectedProviders) {
    Object.assign(dependencies, PROVIDER_DEPENDENCIES[provider])
  }

  return dependencies
}

function getMissingDependencies(projectRoot, selectedProviders) {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (!fileExists(packageJsonPath)) {
    throw new Error(`No package.json found in ${projectRoot}`)
  }

  const packageJson = JSON.parse(readText(packageJsonPath))
  const dependencies = packageJson.dependencies ?? {}
  const requiredDependencies = getRequiredDependencies(selectedProviders)

  return Object.keys(requiredDependencies).filter((name) => !dependencies[name])
}

function ensureDependencies(projectRoot, selectedProviders) {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (!fileExists(packageJsonPath)) {
    throw new Error(`No package.json found in ${projectRoot}`)
  }

  const packageJson = JSON.parse(readText(packageJsonPath))
  const requiredDependencies = getRequiredDependencies(selectedProviders)
  packageJson.dependencies ??= {}

  const added = []

  for (const [name, version] of Object.entries(requiredDependencies)) {
    if (!packageJson.dependencies[name]) {
      packageJson.dependencies[name] = version
      added.push(`${name}@${version}`)
    }
  }

  if (added.length > 0) {
    writeText(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }

  return { changed: added.length > 0, added }
}

function readPackageManagerField(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (!fileExists(packageJsonPath)) return null

  const packageJson = JSON.parse(readText(packageJsonPath))
  const packageManager = packageJson.packageManager

  if (typeof packageManager !== 'string') return null

  const name = packageManager.split('@')[0]
  if (!PACKAGE_MANAGERS.has(name)) return null

  return { name, source: `packageManager (${packageManager})` }
}

function detectPackageManager(projectRoot) {
  const fromPackageJson = readPackageManagerField(projectRoot)
  if (fromPackageJson) return fromPackageJson

  const lockfiles = [
    ['pnpm', 'pnpm-lock.yaml'],
    ['npm', 'package-lock.json'],
    ['yarn', 'yarn.lock'],
    ['bun', 'bun.lockb'],
    ['bun', 'bun.lock'],
  ]

  for (const [name, lockfile] of lockfiles) {
    if (fileExists(path.join(projectRoot, lockfile))) {
      return { name, source: lockfile }
    }
  }

  return { name: 'npm', source: 'default' }
}

function getInstallCommand(packageManager) {
  return {
    command: packageManager,
    args: ['install'],
    display: `${packageManager} install`,
  }
}

function installDependencies(projectRoot, packageManager) {
  const installCommand = getInstallCommand(packageManager)
  const result = spawnSync(installCommand.command, installCommand.args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.error) {
    throw new Error(
      `Could not run ${installCommand.display}: ${result.error.message}`
    )
  }

  if (result.status !== 0) {
    throw new Error(`${installCommand.display} exited with code ${result.status}`)
  }

  return installCommand.display
}

function relativeImportPath(fromFilePath, toDirectoryPath) {
  let relativePath = path
    .relative(path.dirname(fromFilePath), toDirectoryPath)
    .split(path.sep)
    .join('/')

  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`
  }

  return relativePath
}

function identifierExists(source, identifier) {
  return new RegExp(`\\b${identifier}\\b`).test(source)
}

function buildLayoutImports(basePath, selectedProviders) {
  const providerImports = selectedProviders.map(
    (provider) => PROVIDER_LAYOUT_COMPONENTS[provider]
  )

  return [...SHARED_LAYOUT_COMPONENTS, ...providerImports].map((item) => ({
    identifier: item.identifier,
    statement: item.importStatement(basePath),
  }))
}

function buildLayoutElements(selectedProviders) {
  return [
    ...selectedProviders.map(
      (provider) => PROVIDER_LAYOUT_COMPONENTS[provider].element
    ),
    SHARED_LAYOUT_COMPONENTS.find((item) => item.identifier === 'AnalyticsToggle')
      .element,
  ]
}

function upsertLayout(layoutSource, selectedProviders, analyticsImportBasePath) {
  let output = layoutSource
  const providerOpen = '<AnalyticsConsentProvider>'
  const providerClose = '</AnalyticsConsentProvider>'
  const desiredElements = buildLayoutElements(selectedProviders)
  const missingImports = buildLayoutImports(
    analyticsImportBasePath,
    selectedProviders
  )
    .filter((item) => !identifierExists(output, item.identifier))
    .map((item) => item.statement)

  if (missingImports.length > 0) {
    const importMatches = [...output.matchAll(/^import .*$/gm)]
    if (importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1]
      const insertAt = (lastImport.index ?? 0) + lastImport[0].length
      output = `${output.slice(0, insertAt)}\n${missingImports.join('\n')}${output.slice(insertAt)}`
    } else {
      output = `${missingImports.join('\n')}\n\n${output}`
    }
  }

  if (!output.includes('<AnalyticsConsentProvider')) {
    const childrenLineMatch = output.match(/^(\s*)\{children\}\s*$/m)

    if (childrenLineMatch && childrenLineMatch.index != null) {
      const indent = childrenLineMatch[1]
      const wrapped = [
        `${indent}<AnalyticsConsentProvider>`,
        `${indent}  {children}`,
        '',
        ...desiredElements.map((line) => `${indent}  ${line}`),
        `${indent}</AnalyticsConsentProvider>`,
      ].join('\n')

      return `${output.slice(0, childrenLineMatch.index)}${wrapped}${output.slice(childrenLineMatch.index + childrenLineMatch[0].length)}`
    }

    if (output.includes('{children}')) {
      return output.replace(
        '{children}',
        `<AnalyticsConsentProvider>{children}${desiredElements.join('')}</AnalyticsConsentProvider>`
      )
    }

    return output
  }

  if (!output.includes(providerClose)) {
    return output
  }

  const missingComponents = desiredElements.filter((line) => !output.includes(line))

  if (missingComponents.length === 0) {
    return output
  }

  const closeIndex = output.indexOf(providerClose)
  const beforeClose = output.slice(0, closeIndex)
  const afterClose = output.slice(closeIndex)
  const indentMatch = beforeClose.match(/^(\s*)<AnalyticsConsentProvider(?:\s|>)?.*$/m)
  const indent = indentMatch ? `${indentMatch[1]}  ` : '          '
  const insert = `\n${missingComponents.map((line) => `${indent}${line}`).join('\n')}`

  return `${beforeClose}${insert}\n${afterClose}`
}

function ensureProxyImports(proxySource) {
  let output = proxySource

  if (!output.includes("from 'next/server'")) {
    return `import { NextResponse } from 'next/server'\nimport type { NextRequest } from 'next/server'\n\n${output}`
  }

  if (!output.includes('NextResponse')) {
    output = output.replace(
      /import\s*\{([^}]*)\}\s*from\s*'next\/server'/,
      (full, members) => {
        const values = members
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)

        if (!values.includes('NextResponse')) values.unshift('NextResponse')
        return `import { ${values.join(', ')} } from 'next/server'`
      }
    )
  }

  if (!output.includes('NextRequest')) {
    const importMatches = [...output.matchAll(/^import .*$/gm)]

    if (importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1]
      const insertAt = (lastImport.index ?? 0) + lastImport[0].length
      output = `${output.slice(0, insertAt)}\nimport type { NextRequest } from 'next/server'${output.slice(insertAt)}`
    } else {
      output = `import type { NextRequest } from 'next/server'\n${output}`
    }
  }

  return output
}

function upsertProxy(proxySource) {
  let output = ensureProxyImports(proxySource)

  if (!output.includes('ANALYTICS_REGION_COOKIE')) {
    const exportIndex = output.indexOf('export function proxy')
    if (exportIndex !== -1) {
      output = `${output.slice(0, exportIndex)}${PROXY_HELPER_BLOCK}\n${output.slice(exportIndex)}`
    }
  }

  if (
    output.includes('ANALYTICS_REGION_COOKIE') &&
    !output.includes('response.cookies.set(ANALYTICS_REGION_COOKIE')
  ) {
    output = output.replace(
      /^(\s*)return response\s*$/m,
      `$1response.cookies.set(ANALYTICS_REGION_COOKIE, getConsentRegion(req), {\n$1  maxAge: 60 * 60 * 24 * 30,\n$1  path: '/',\n$1  sameSite: 'lax',\n$1  secure: req.nextUrl.protocol === 'https:',\n$1})\n\n$1return response`
    )
  }

  return output
}

function getTemplateFiles(selectedProviders) {
  return [
    ...COMMON_TEMPLATE_FILES,
    ...selectedProviders.flatMap((provider) => PROVIDER_TEMPLATE_FILES[provider]),
  ]
}

function getExistingTemplateFiles(targetRoot, selectedProviders) {
  return getTemplateFiles(selectedProviders).filter((relPath) =>
    fileExists(path.join(targetRoot, relPath))
  )
}

function copyAnalyticsTemplates(
  templatesRoot,
  targetRoot,
  selectedProviders,
  force
) {
  const created = []
  const overwritten = []

  for (const relPath of getTemplateFiles(selectedProviders)) {
    const sourcePath = path.join(templatesRoot, relPath)
    const destinationPath = path.join(targetRoot, relPath)
    const source = readText(sourcePath)

    if (!fileExists(destinationPath)) {
      writeText(destinationPath, source)
      created.push(destinationPath)
      continue
    }

    if (force) {
      writeText(destinationPath, source)
      overwritten.push(destinationPath)
    }
  }

  return { created, overwritten }
}

function ensureProxy(projectRoot, templatesDir) {
  const proxyPath = path.join(projectRoot, 'proxy.ts')
  const proxyTemplatePath = path.join(templatesDir, 'proxy.ts')

  if (!fileExists(proxyPath)) {
    const fallbackTemplate = `import { NextResponse } from 'next/server'\nimport type { NextRequest } from 'next/server'\n\n${PROXY_HELPER_BLOCK}export function proxy(req: NextRequest) {\n  const response = NextResponse.next()\n\n  response.cookies.set(ANALYTICS_REGION_COOKIE, getConsentRegion(req), {\n    maxAge: 60 * 60 * 24 * 30,\n    path: '/',\n    sameSite: 'lax',\n    secure: req.nextUrl.protocol === 'https:',\n  })\n\n  return response\n}\n\nexport const config = {\n  matcher: [\n    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',\n  ],\n}\n`

    if (fileExists(proxyTemplatePath)) {
      writeText(proxyPath, readText(proxyTemplatePath))
    } else {
      writeText(proxyPath, fallbackTemplate)
    }

    return { created: true, updated: false, skipped: false }
  }

  const existing = readText(proxyPath)
  const merged = upsertProxy(existing)

  if (merged !== existing) {
    writeText(proxyPath, merged)
    return { created: false, updated: true, skipped: false }
  }

  return { created: false, updated: false, skipped: false }
}

function ensureLayout(projectRoot, analyticsRoot, selectedProviders) {
  const layoutPath = resolveLayoutPath(projectRoot)

  if (!layoutPath) {
    return { found: false, updated: false, skipped: false }
  }

  const importBasePath = relativeImportPath(layoutPath, analyticsRoot)
  const existing = readText(layoutPath)
  const merged = upsertLayout(existing, selectedProviders, importBasePath)

  if (merged !== existing) {
    writeText(layoutPath, merged)
    return { found: true, updated: true, path: layoutPath, skipped: false }
  }

  return { found: true, updated: false, path: layoutPath, skipped: false }
}

function upsertEnvVar(source, key, value) {
  if (!value) return source

  const line = `${key}=${value}`
  const matcher = new RegExp(`^${key}=.*$`, 'm')

  if (matcher.test(source)) {
    return source.replace(matcher, line)
  }

  const separator = source.length === 0 || source.endsWith('\n') ? '' : '\n'
  return `${source}${separator}${line}\n`
}

function ensureEnvFile(projectRoot, envValues) {
  const entries = Object.entries(envValues).filter(([, value]) => value)
  if (entries.length === 0) {
    return { updated: false, path: null }
  }

  const envPath = path.join(projectRoot, '.env.local')
  let source = fileExists(envPath) ? readText(envPath) : ''

  for (const [key, value] of entries) {
    source = upsertEnvVar(source, key, value)
  }

  writeText(envPath, source)
  return { updated: true, path: envPath }
}

async function promptText(rl, question, defaultValue = '') {
  const suffix = defaultValue ? ` (${defaultValue})` : ''
  const answer = (await rl.question(`${question}${suffix}: `)).trim()

  return answer || defaultValue
}

async function promptConfirm(rl, question, defaultValue = false) {
  const suffix = defaultValue ? 'Y/n' : 'y/N'

  while (true) {
    const answer = (await rl.question(`${question} [${suffix}]: `))
      .trim()
      .toLowerCase()

    if (!answer) return defaultValue
    if (answer === 'y' || answer === 'yes') return true
    if (answer === 'n' || answer === 'no') return false

    process.stdout.write('Please answer yes or no.\n')
  }
}

async function promptAnalyticsChoice(rl) {
  process.stdout.write(
    [
      '',
      'What would you like to add?',
      '  1. Microsoft Clarity + Google Analytics',
      '  2. Microsoft Clarity only',
      '  3. Google Analytics only',
      '',
    ].join('\n')
  )

  while (true) {
    const answer = (await promptText(rl, 'Choose an option', '1')).toLowerCase()

    if (answer === '1') return 'both'
    if (answer === '2') return 'clarity'
    if (answer === '3') return 'ga'

    try {
      return normalizeAnalyticsChoice(answer)
    } catch {
      process.stdout.write('Please choose 1, 2, 3, clarity, ga, or both.\n')
    }
  }
}

async function resolveInteractiveOptions({
  args,
  projectRoot,
  analyticsRoot,
  detectedPackageManager,
}) {
  const interactive = process.stdin.isTTY && process.stdout.isTTY && !args.yes
  const options = {
    analytics: args.analytics ?? 'both',
    force: args.force,
    install: args.install ?? false,
    packageManager: args.packageManager ?? detectedPackageManager.name,
    envValues: {},
  }

  if (!interactive) {
    return options
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })

  try {
    if (!args.analytics) {
      options.analytics = await promptAnalyticsChoice(rl)
    }

    const selectedProviders = selectedProvidersFromChoice(options.analytics)
    const existingFiles = getExistingTemplateFiles(analyticsRoot, selectedProviders)

    if (!args.force && existingFiles.length > 0) {
      options.force = await promptConfirm(
        rl,
        `${existingFiles.length} analytics file(s) already exist. Overwrite them?`,
        false
      )
    }

    if (!args.packageManager) {
      process.stdout.write(
        `Detected package manager: ${detectedPackageManager.name} (${detectedPackageManager.source})\n`
      )
    }

    const missingDependencies = getMissingDependencies(projectRoot, selectedProviders)

    if (args.install == null && missingDependencies.length > 0) {
      options.install = await promptConfirm(
        rl,
        `Install ${missingDependencies.join(', ')} with ${options.packageManager}?`,
        true
      )
    }

    if (await promptConfirm(rl, 'Add analytics IDs to .env.local?', false)) {
      if (selectedProviders.includes('clarity')) {
        options.envValues.NEXT_PUBLIC_CLARITY_PROJECT_ID = await promptText(
          rl,
          'Clarity project ID (leave blank to skip)'
        )
      }

      if (selectedProviders.includes('ga')) {
        options.envValues.NEXT_PUBLIC_GOOGLE_TAG = await promptText(
          rl,
          'Google Analytics tag (leave blank to skip)'
        )
      }
    }

    return options
  } finally {
    rl.close()
  }
}

function printUsage() {
  process.stdout.write(
    [
      'Usage:',
      '  next-analytics-installer init [options]',
      '',
      'Options:',
      '  --project <path>              Project root to patch (default: current working directory)',
      '  --analytics <clarity|ga|both> Providers to install (default: interactive, both in CI)',
      '  --package-manager <name>      Override detected npm, pnpm, yarn, or bun',
      '  --install                     Run the detected package manager install command',
      '  --no-install                  Do not install dependencies after editing package.json',
      '  --force                       Overwrite existing analytics folder files',
      '  --no-layout                   Do not patch app/layout.tsx',
      '  --no-proxy                    Do not create or patch proxy.ts',
      '  --yes, -y                     Skip prompts and use defaults',
      '',
      'Examples:',
      '  next-analytics-installer init',
      '  next-analytics-installer init --analytics ga --project ./frontend',
      '  next-analytics-installer init --analytics clarity --package-manager pnpm --install',
      '',
    ].join('\n')
  )
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.command !== 'init') {
    printUsage()
    process.exit(1)
  }

  const projectRoot = args.project
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const templatesRoot = path.join(packageRoot, 'templates', 'analytics')

  if (!fileExists(path.join(projectRoot, 'package.json'))) {
    throw new Error(`Could not find package.json in ${projectRoot}`)
  }

  const analyticsRoot = path.join(resolveAnalyticsTargetRoot(projectRoot), 'analytics')
  const detectedPackageManager = detectPackageManager(projectRoot)
  const options = await resolveInteractiveOptions({
    args,
    projectRoot,
    analyticsRoot,
    detectedPackageManager,
  })
  const selectedProviders = selectedProvidersFromChoice(options.analytics)
  const copied = copyAnalyticsTemplates(
    templatesRoot,
    analyticsRoot,
    selectedProviders,
    options.force
  )
  const layoutResult = args.layout
    ? ensureLayout(projectRoot, analyticsRoot, selectedProviders)
    : { found: false, updated: false, skipped: true }
  const proxyResult = args.proxy
    ? ensureProxy(projectRoot, path.join(packageRoot, 'templates'))
    : { created: false, updated: false, skipped: true }
  const dependenciesResult = ensureDependencies(projectRoot, selectedProviders)
  const envResult = ensureEnvFile(projectRoot, options.envValues)
  const installCommand = getInstallCommand(options.packageManager).display
  let installedWith = null

  if (options.install && dependenciesResult.added.length > 0) {
    installedWith = installDependencies(projectRoot, options.packageManager)
  }

  const output = []
  output.push('next-analytics-installer complete')
  output.push(`- selected analytics: ${formatProviderLabels(selectedProviders)}`)
  output.push(
    `- package manager: ${options.packageManager} (${args.packageManager ? 'manual override' : detectedPackageManager.source})`
  )
  output.push(`- analytics files created: ${copied.created.length}`)
  output.push(`- analytics files overwritten: ${copied.overwritten.length}`)

  if (layoutResult.skipped) {
    output.push('- layout.tsx: skipped')
  } else if (!layoutResult.found) {
    output.push('- layout.tsx not found (expected src/app/layout.tsx or app/layout.tsx)')
  } else {
    output.push(`- layout.tsx updated: ${layoutResult.updated ? 'yes' : 'no changes needed'}`)
  }

  if (proxyResult.skipped) {
    output.push('- proxy.ts: skipped')
  } else {
    output.push(
      `- proxy.ts: ${proxyResult.created ? 'created' : proxyResult.updated ? 'updated' : 'no changes needed'}`
    )
  }

  output.push(
    `- dependencies added: ${dependenciesResult.added.length > 0 ? dependenciesResult.added.join(', ') : 'none'}`
  )

  if (dependenciesResult.added.length > 0) {
    output.push(
      `- dependencies installed: ${installedWith ? `yes (${installedWith})` : `no; run ${installCommand}`}`
    )
  }

  if (envResult.updated) {
    output.push(`- env updated: ${path.relative(projectRoot, envResult.path)}`)
  }

  process.stdout.write(`${output.join('\n')}\n`)
}

try {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  await main()
} catch (error) {
  process.stdout.write(`next-analytics-installer failed: ${error.message}\n`)
  process.exit(1)
}
