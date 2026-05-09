type CF = IncomingRequestCfProperties;

type RequestWithCF = Request & {
  cf?: CF;
};

const CONSENT_REQUIRED_COUNTRIES = new Set<string>([
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

export async function getRegion(request: Request): Promise<Response> {
  const cf = (request as RequestWithCF).cf;

  const country = cf?.country ?? null;
  const colo = cf?.colo ?? null;

  const consentRequired =
    typeof country === "string" && CONSENT_REQUIRED_COUNTRIES.has(country);

  return Response.json(
    {
      country,
      colo,
      consentRequired,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}