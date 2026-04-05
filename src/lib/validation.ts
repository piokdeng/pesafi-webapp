import { z } from 'zod';

/**
 * Validation schemas for user inputs
 * Prevents SQL injection and ensures data integrity
 */

// Ethereum address validation (0x followed by 40 hex characters)
export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');

// Phone number validation (E.164 format)
export const phoneNumberSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 expected)');

// Email validation
export const emailSchema = z.string().email('Invalid email format');

// User ID validation (UUID v4)
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Amount validation (positive number with up to 6 decimals for USDC)
export const usdcAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be finite')
  .refine((val) => {
    const decimals = val.toString().split('.')[1]?.length || 0;
    return decimals <= 6;
  }, 'Amount cannot have more than 6 decimal places');

// Transaction hash validation
export const txHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format');

/**
 * Validation helper function
 * Validates input and returns formatted error response
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map(e => e.message).join(', ');
      return { success: false, error: message };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Contact name validation
export const contactNameSchema = z
  .string()
  .trim()
  .min(1, 'Contact name is required')
  .max(255, 'Contact name must be 255 characters or less');

// Create contact schema
export const createContactSchema = z.object({
  name: contactNameSchema,
  walletAddress: ethereumAddressSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  isFavorite: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.walletAddress || data.phoneNumber,
  'At least one of wallet address or phone number is required'
);

// Update contact schema (all fields optional)
export const updateContactSchema = z.object({
  name: contactNameSchema.optional(),
  walletAddress: ethereumAddressSchema.optional().nullable(),
  phoneNumber: phoneNumberSchema.optional().nullable(),
  isFavorite: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
}).refine(
  (data) => {
    // If both are explicitly set to null, reject
    if (data.walletAddress === null && data.phoneNumber === null) {
      return false;
    }
    return true;
  },
  'At least one of wallet address or phone number must remain'
);

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>\"']/g, '');
}

/**
 * Normalize Ethereum address to lowercase checksum format
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }

  return normalized;
}
