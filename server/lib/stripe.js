import Stripe from 'stripe';

/**
 * Stripe client with automatic sandbox / mock-mode detection.
 *
 * When the secret key is a placeholder (or missing), all billing
 * endpoints fall back to a mock sandbox simulator so developers
 * can work without a live Stripe account.
 */

const PLACEHOLDER_KEYS = [
  'sk_test_yourkeyhere',
  'sk_test_placeholder',
  'your_stripe_secret_key',
  ''
];

const rawKey = (process.env.STRIPE_SECRET_KEY || '').trim();

export const isMockMode = !rawKey || PLACEHOLDER_KEYS.includes(rawKey.toLowerCase());

let stripe = null;

if (!isMockMode) {
  try {
    stripe = new Stripe(rawKey, { apiVersion: '2024-04-10' });
    console.log('✅ Stripe client initialised (LIVE mode)');
  } catch (err) {
    console.error('⚠️  Failed to initialise Stripe client — falling back to mock mode:', err.message);
    stripe = null;
  }
} else {
  console.log('🧪 Stripe running in SANDBOX / mock mode (placeholder key detected)');
}

export { stripe };
