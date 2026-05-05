'use client'

import Script from 'next/script'
import { isLocalAnalyticsHost } from './local-traffic'
import { useAnalyticsConsent } from './store/analytics-consent'

export default function GoogleAnalytics() {
  const consent = useAnalyticsConsent((s) => s.consent)
  const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG
  const useGA = process.env.NEXT_PUBLIC_USE_GA ?? 'true'

  if (useGA === 'false') return null

  const isLocalHost =
    typeof window !== 'undefined' &&
    isLocalAnalyticsHost(window.location.hostname)

  if (!GA_ID || consent !== 'granted' || isLocalHost) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  )
}
