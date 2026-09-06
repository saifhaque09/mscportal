// Lightweight IANA timezone -> ISO 3166-1 alpha-2 lookup for defaulting the
// Country/phone-code pickers. Not exhaustive — just the common cases; falls
// back to Canada (this platform's primary market) when a timezone isn't
// mapped, which the user can always override.
const TIMEZONE_COUNTRY_MAP = {
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/Regina": "CA",
  "America/St_Johns": "CA",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Asia/Kolkata": "IN",
  "Asia/Dubai": "AE",
};

export function guessCountryFromTimezone(fallback = "CA") {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_COUNTRY_MAP[timezone] || fallback;
  } catch (err) {
    return fallback;
  }
}
