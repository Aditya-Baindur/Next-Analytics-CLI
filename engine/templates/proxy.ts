import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ANALYTICS_REGION_COOKIE = 'analytics-consent-region'

const CONSENT_REQUIRED_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
])

function getRequestCountry(req: NextRequest) {
  const country =
    req.headers.get('cf-ipcountry') ?? req.headers.get('x-vercel-ip-country')

  return country?.trim().toUpperCase()
}

function getConsentRegion(req: NextRequest) {
  const country = getRequestCountry(req)

  if (!country || country === 'XX' || country === 'T1') {
    return 'not-required'
  }

  return CONSENT_REQUIRED_COUNTRIES.has(country) ? 'required' : 'not-required'
}

export function proxy(req: NextRequest) {
  const response = NextResponse.next()

  response.cookies.set(ANALYTICS_REGION_COOKIE, getConsentRegion(req), {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
  })

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
}
