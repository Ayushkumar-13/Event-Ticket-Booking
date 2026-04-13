/**
 * Currency Formatter Utility
 * Uses the native browser Intl.NumberFormat for professional, localized currency display.
 */

const currencyMap = {
    'INR': { locale: 'en-IN', currency: 'INR' },
    'USD': { locale: 'en-US', currency: 'USD' },
    'EUR': { locale: 'de-DE', currency: 'EUR' },
    'GBP': { locale: 'en-GB', currency: 'GBP' },
    'CAD': { locale: 'en-CA', currency: 'CAD' },
    'AUD': { locale: 'en-AU', currency: 'AUD' }
};

/**
 * Format an amount based on currency code
 */
export const formatCurrency = (amount, currencyCode = 'INR') => {
    const config = currencyMap[currencyCode] || currencyMap['INR'];
    
    return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.currency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2, // No decimals for round numbers
        maximumFractionDigits: 2
    }).format(amount);
};
