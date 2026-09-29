/**
 * Requirement #1 — country filter.
 *
 * Flags are rendered as emoji derived from the ISO code rather than shipped as
 * images, so any code the backend returns gets a flag with no extra assets and
 * no broken-image states.
 */

/** Countries the app actually serves, in the order the filter bar shows them. */
export const PRIORITY_COUNTRIES = ['BD', 'IN', 'PK', 'NP', 'LK', 'ID', 'PH', 'MY', 'AE', 'SA'];

const COUNTRY_NAMES: Record<string, string> = {
  AE: 'UAE',
  AF: 'Afghanistan',
  AU: 'Australia',
  BD: 'Bangladesh',
  BH: 'Bahrain',
  BR: 'Brazil',
  BT: 'Bhutan',
  CA: 'Canada',
  CN: 'China',
  DE: 'Germany',
  EG: 'Egypt',
  ES: 'Spain',
  FR: 'France',
  GB: 'United Kingdom',
  ID: 'Indonesia',
  IN: 'India',
  IQ: 'Iraq',
  IR: 'Iran',
  IT: 'Italy',
  JO: 'Jordan',
  JP: 'Japan',
  KE: 'Kenya',
  KR: 'South Korea',
  KW: 'Kuwait',
  LK: 'Sri Lanka',
  MA: 'Morocco',
  MM: 'Myanmar',
  MV: 'Maldives',
  MX: 'Mexico',
  MY: 'Malaysia',
  NG: 'Nigeria',
  NL: 'Netherlands',
  NP: 'Nepal',
  OM: 'Oman',
  PH: 'Philippines',
  PK: 'Pakistan',
  QA: 'Qatar',
  RU: 'Russia',
  SA: 'Saudi Arabia',
  SG: 'Singapore',
  TH: 'Thailand',
  TR: 'Turkey',
  TW: 'Taiwan',
  UA: 'Ukraine',
  US: 'United States',
  UZ: 'Uzbekistan',
  VN: 'Vietnam',
  ZA: 'South Africa',
};

const CODE_PATTERN = /^[A-Za-z]{2}$/;

/** The sentinel the filter bar uses for "no country constraint". */
export const ALL_COUNTRIES = 'ALL';

/**
 * Flag emoji for an ISO alpha-2 code, built from the two regional-indicator
 * symbols. Returns the globe for `ALL` or anything that is not a 2-letter code.
 */
export function flagEmoji(code?: string | null): string {
  if (!code || code === ALL_COUNTRIES || !CODE_PATTERN.test(code)) return '🌍';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...[...upper].map((char) => 0x1f1a5 + char.charCodeAt(0))
  );
}

/** Display name for a code, falling back to the code itself. */
export function countryName(code?: string | null): string {
  if (!code || code === ALL_COUNTRIES) return 'All';
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] || upper;
}

/** `🇧🇩 Bangladesh` — used in profile headers and details pages. */
export function countryLabel(code?: string | null): string {
  if (!code) return '';
  return `${flagEmoji(code)} ${countryName(code)}`;
}

/** Every country the app knows about, alphabetically by name. */
export function allCountries(): { code: string; name: string }[] {
  return Object.keys(COUNTRY_NAMES)
    .map((code) => ({ code, name: COUNTRY_NAMES[code] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Order codes for the filter bar: the app's core markets first (in
 * PRIORITY_COUNTRIES order), then everything else alphabetically by name.
 */
export function sortForFilterBar(codes: string[]): string[] {
  const seen = new Set<string>();
  const unique = codes
    .map((c) => c.toUpperCase())
    .filter((c) => CODE_PATTERN.test(c) && !seen.has(c) && seen.add(c) !== undefined);

  const priority = PRIORITY_COUNTRIES.filter((c) => unique.includes(c));
  const rest = unique
    .filter((c) => !PRIORITY_COUNTRIES.includes(c))
    .sort((a, b) => countryName(a).localeCompare(countryName(b)));

  return [...priority, ...rest];
}
