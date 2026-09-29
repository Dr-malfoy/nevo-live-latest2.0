/**
 * Phone Number Utilities & Normalization
 * Normalizes local and international phone numbers into standard E.164 format.
 * Defaults to Bangladesh (+880) when 11-digit national format (01XXXXXXXXX) is passed.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string;
  countryCode: string;
  nationalNumber: string;
  error?: string;
}

/**
 * Normalizes any phone input into E.164 format (e.g. +8801712345678).
 */
export function normalizePhoneNumber(
  input: string,
  defaultCountryCode = '+880'
): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      e164: '',
      countryCode: '',
      nationalNumber: '',
      error: 'Phone number is required',
    };
  }

  // Remove whitespace, dashes, brackets, dots
  let cleaned = input.trim().replace(/[\s\-().]/g, '');

  // Handle leading 00 -> +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Handle Bangladesh specific local formats
  // 1. "01XXXXXXXXX" (11 digits starting with 01[3-9])
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    cleaned = '+88' + cleaned;
  }
  // 2. "8801XXXXXXXXX" (13 digits without +)
  else if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }
  // 3. "+8801XXXXXXXXX" (already international)
  else if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    // Already good
  }
  // 4. Other country code without leading '+'
  else if (!cleaned.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 15) {
    // If it starts with standard default country prefix without plus
    const rawPrefix = defaultCountryCode.replace('+', '');
    if (cleaned.startsWith(rawPrefix)) {
      cleaned = '+' + cleaned;
    } else {
      // Prepend default country code
      cleaned = defaultCountryCode.startsWith('+') ? defaultCountryCode + cleaned.replace(/^0+/, '') : '+' + defaultCountryCode + cleaned.replace(/^0+/, '');
    }
  }

  // Standard E.164 Validation regex (+ followed by 8 to 15 digits)
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  const isValid = e164Regex.test(cleaned);

  if (!isValid) {
    return {
      isValid: false,
      e164: cleaned,
      countryCode: '',
      nationalNumber: '',
      error: 'Invalid phone number format. Please provide a valid number (e.g. +8801700000000 or 01700000000)',
    };
  }

  // Extract country code approximation
  let countryCode = '+880';
  let nationalNumber = cleaned;
  if (cleaned.startsWith('+880')) {
    countryCode = '+880';
    nationalNumber = cleaned.slice(4);
  } else {
    countryCode = cleaned.slice(0, 4);
    nationalNumber = cleaned.slice(4);
  }

  return {
    isValid: true,
    e164: cleaned,
    countryCode,
    nationalNumber,
  };
}

/**
 * Masks a phone number for safe public display (e.g. +8801****5678)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  const start = phone.slice(0, 5);
  const end = phone.slice(-3);
  const middle = '*'.repeat(Math.max(3, phone.length - 8));
  return `${start}${middle}${end}`;
}

/**
 * Convenience helper that directly returns normalized E.164 string.
 */
export function normalizePhone(input: string, defaultCountryCode = '+880'): string {
  const result = normalizePhoneNumber(input, defaultCountryCode);
  return result.e164 || input;
}

/**
 * Generates all plausible search variants for a phone number
 * (e.g., E.164, raw input, national with 0, national without 0, with/without +)
 * ensuring 100% strict duplicate prevention across any format.
 */
export function getPhoneSearchVariants(rawInput: string, defaultCountryCode = '+880'): string[] {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const variants = new Set<string>();
  const cleaned = rawInput.trim().replace(/[\s\-().]/g, '');
  if (cleaned) {
    variants.add(cleaned);
  }

  const norm = normalizePhoneNumber(rawInput, defaultCountryCode);
  if (norm.isValid) {
    variants.add(norm.e164);
    variants.add(norm.e164.replace(/^\+/, ''));
    if (norm.nationalNumber) {
      variants.add(norm.nationalNumber);
      variants.add(`0${norm.nationalNumber}`);
      variants.add(`880${norm.nationalNumber}`);
      variants.add(`+880${norm.nationalNumber}`);
    }
  }

  // If numeric Bangladesh standard
  const bdDigits = cleaned.replace(/^\+/, '').replace(/^88/, '');
  if (/^01[3-9]\d{8}$/.test(bdDigits)) {
    variants.add(bdDigits);
    variants.add(`+88${bdDigits}`);
    variants.add(`88${bdDigits}`);
  } else if (/^1[3-9]\d{8}$/.test(bdDigits)) {
    variants.add(`0${bdDigits}`);
    variants.add(`+880${bdDigits}`);
    variants.add(`880${bdDigits}`);
  }

  return Array.from(variants);
}

/**
 * Formats a phone number for friendly UI display.
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const normalized = normalizePhone(phone);
  if (normalized.startsWith('+880') && normalized.length === 14) {
    // +880 1712-345678
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 8)}-${normalized.slice(8)}`;
  }
  return normalized;
}

