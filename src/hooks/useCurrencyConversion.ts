import { useState, useEffect } from 'react';

interface ExchangeRates {
  [currency: string]: number;
}

/**
 * Hook to fetch and manage currency conversion rates
 * Uses Coinbase API for real-time exchange rates
 */
export function useCurrencyConversion(selectedCurrency: string = 'KES') {
  const [rates, setRates] = useState<ExchangeRates>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        setError(null);

        // Coinbase public API endpoint for exchange rates
        // This endpoint provides USD-based exchange rates
        const response = await fetch(
          'https://api.coinbase.com/v2/exchange-rates?currency=USD'
        );

        if (!response.ok) {
          throw new Error('Failed to fetch exchange rates');
        }

        const data = await response.json();
        setRates(data.data.rates);
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');

        // Fallback to cached rates or default rates
        setRates(getFallbackRates());
      } finally {
        setLoading(false);
      }
    };

    fetchRates();

    // Refresh rates every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Convert USD amount to target currency
   */
  const convertToLocalCurrency = (usdAmount: number): number => {
    const rate = rates[selectedCurrency];
    if (!rate) {
      console.warn(`Rate not found for ${selectedCurrency}, using fallback`);
      return usdAmount * getFallbackRates()[selectedCurrency];
    }
    // Rate can be either string or number from API
    const numericRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    return usdAmount * numericRate;
  };

  /**
   * Format the converted amount with currency symbol
   */
  const formatLocalAmount = (usdAmount: number): string => {
    const converted = convertToLocalCurrency(usdAmount);
    return `${selectedCurrency} ${converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return {
    rates,
    loading,
    error,
    convertToLocalCurrency,
    formatLocalAmount,
  };
}

/**
 * Fallback exchange rates (approximate values as of 2024)
 * Used when API is unavailable
 */
function getFallbackRates(): ExchangeRates {
  return {
    KES: 129.50,    // Kenyan Shilling
    TZS: 2520.00,   // Tanzanian Shilling
    UGX: 3680.00,   // Ugandan Shilling
    RWF: 1285.00,   // Rwandan Franc
    ETB: 55.50,     // Ethiopian Birr
    SSP: 1303.50,   // South Sudanese Pound
    SDG: 601.50,    // Sudanese Pound
    SOS: 571.50,    // Somali Shilling
    BIF: 2870.00,   // Burundian Franc
    ERN: 15.00,     // Eritrean Nakfa
    NGN: 745.00,    // Nigerian Naira
    GHS: 12.05,     // Ghanaian Cedi
    ZAR: 18.50,     // South African Rand
    ZWL: 322.00,    // Zimbabwean Dollar
    USD: 1.00,      // US Dollar
  };
}
