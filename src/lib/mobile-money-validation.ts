/**
 * Mobile Money Validation Utilities
 *
 * Shared between client components and server routes.
 * Provides phone→country→currency detection and supported combo validation.
 */

// Phone prefix → ISO country code
const PHONE_PREFIX_TO_COUNTRY: Record<string, string> = {
  '+254': 'KE', '+256': 'UG', '+255': 'TZ', '+233': 'GH',
  '+234': 'NG', '+27': 'ZA', '+250': 'RW', '+243': 'CD',
  '+251': 'ET', '+260': 'ZM', '+237': 'CM', '+221': 'SN',
  '+225': 'CI', '+20': 'EG', '+258': 'MZ', '+265': 'MW',
  '+266': 'LS', '+224': 'GN', '+211': 'SS',
}

// Country → local fiat currency
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  KE: 'KES', UG: 'UGX', TZ: 'TZS', GH: 'GHS', NG: 'NGN',
  ZA: 'ZAR', RW: 'RWF', CD: 'CDF', ET: 'ETB', ZM: 'ZMW',
  CM: 'XAF', SN: 'XOF', CI: 'XOF', EG: 'EGP', MZ: 'MZN',
  MW: 'MWK', LS: 'LSL', GN: 'GNF', SS: 'SSP',
}

// Which providers operate in which countries (Kotani Pay supported)
const PROVIDER_COUNTRIES: Record<string, string[]> = {
  MPESA: ['KE', 'TZ'],
  MTN: ['GH', 'UG', 'SS'],
  AIRTEL: ['UG', 'TZ'],
  VODAFONE: ['GH'],
}

// Countries where Kotani Pay mobile money actually works
const SUPPORTED_COUNTRIES = new Set(['KE', 'UG', 'TZ', 'GH', 'SS'])

// Country → display name
const COUNTRY_NAMES: Record<string, string> = {
  KE: 'Kenya', UG: 'Uganda', TZ: 'Tanzania', GH: 'Ghana',
  NG: 'Nigeria', ZA: 'South Africa', RW: 'Rwanda', CD: 'DRC',
  ET: 'Ethiopia', ZM: 'Zambia', CM: 'Cameroon', SN: 'Senegal',
  CI: "Côte d'Ivoire", EG: 'Egypt', MZ: 'Mozambique', MW: 'Malawi',
  LS: 'Lesotho', GN: 'Guinea', SS: 'South Sudan',
}

/**
 * Detect country code from phone number prefix.
 * Returns null if unrecognized.
 */
export function detectCountryFromPhone(phone: string): string | null {
  const cleaned = phone.replace(/\s/g, '')
  // Try longest prefix first
  const prefixes = Object.keys(PHONE_PREFIX_TO_COUNTRY).sort((a, b) => b.length - a.length)
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) return PHONE_PREFIX_TO_COUNTRY[prefix]
  }
  return null
}

/**
 * Detect the correct currency for a phone number.
 * Returns null if the phone prefix is unrecognized.
 */
export function detectCurrencyFromPhone(phone: string): string | null {
  const country = detectCountryFromPhone(phone)
  if (!country) return null
  return COUNTRY_TO_CURRENCY[country] || null
}

/**
 * Get the best default provider for a country code.
 */
export function getDefaultProviderForCountry(country: string): string {
  switch (country) {
    case 'KE': return 'MPESA'
    case 'TZ': return 'MPESA'
    case 'UG': return 'MTN'
    case 'GH': return 'MTN'
    case 'SS': return 'MTN'
    default: return 'MPESA'
  }
}

/**
 * Get available providers for a country.
 */
export function getProvidersForCountry(country: string): string[] {
  return Object.entries(PROVIDER_COUNTRIES)
    .filter(([, countries]) => countries.includes(country))
    .map(([provider]) => provider)
}

/**
 * Check if a country is supported for mobile money via Kotani Pay.
 */
export function isSupportedCountry(country: string): boolean {
  return SUPPORTED_COUNTRIES.has(country)
}

/**
 * Get the display name for a country code.
 */
export function getCountryName(country: string): string {
  return COUNTRY_NAMES[country] || country
}

/**
 * Validate a mobile money combination (phone, provider, currency).
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateMobileMoneyCombo(
  phone: string,
  provider: string,
  currency: string
): { valid: boolean; error?: string } {
  if (!phone || phone.length < 8) {
    return { valid: false, error: 'Please enter a valid phone number with country code' }
  }

  const country = detectCountryFromPhone(phone)

  if (!country) {
    return { valid: false, error: 'Phone number country not recognized. Please include the country code (e.g., +254 for Kenya).' }
  }

  if (!isSupportedCountry(country)) {
    const name = getCountryName(country)
    return {
      valid: false,
      error: `Mobile money is not yet available for ${name}. Supported countries: Kenya, Uganda, Tanzania, and Ghana.`,
    }
  }

  const expectedCurrency = COUNTRY_TO_CURRENCY[country]
  if (expectedCurrency && currency !== expectedCurrency) {
    const name = getCountryName(country)
    return {
      valid: false,
      error: `Currency mismatch: ${name} uses ${expectedCurrency}, but ${currency} was selected. Please update the currency.`,
    }
  }

  const providerCountries = PROVIDER_COUNTRIES[provider]
  if (providerCountries && !providerCountries.includes(country)) {
    const name = getCountryName(country)
    const availableProviders = getProvidersForCountry(country)
    const providerNames = availableProviders.join(', ') || 'none available'
    return {
      valid: false,
      error: `${provider} is not available in ${name}. Available providers: ${providerNames}.`,
    }
  }

  return { valid: true }
}

/**
 * Minimum amount in local currency required by Kotani Pay.
 * Returns the minimum for the given currency.
 */
export function getMinimumLocalAmount(currency: string): number {
  // Kotani Pay requires minimum 100 in local currency for most currencies
  return 100
}
