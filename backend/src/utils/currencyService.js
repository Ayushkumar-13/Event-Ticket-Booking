/**
 * Currency Service
 * Handles live exchange rates with a simple caching layer for production performance.
 */

// Simple in-memory cache to stay within free API limits and improve speed
const rateCache = {
    rates: {},
    lastUpdated: 0,
    TTL: 1000 * 60 * 60 // 1 hour cache
};

/**
 * Fetch live exchange rates for INR base
 */
const getLatestRates = async () => {
    const now = Date.now();
    
    // Return cached rates if still valid
    if (rateCache.lastUpdated && (now - rateCache.lastUpdated < rateCache.TTL)) {
        return rateCache.rates;
    }

    try {
        // Using a reliable public API for demonstration
        // For a high-traffic production app, you would use a dedicated API key
        const response = await fetch('https://open.er-api.com/v6/latest/INR');
        const data = await response.json();

        if (data && data.rates) {
            rateCache.rates = data.rates;
            rateCache.lastUpdated = now;
            return data.rates;
        }
        
        throw new Error('Could not fetch rates');
    } catch (error) {
        console.error('🔥 [CurrencyService] Live rate fetch failed:', error.message);
        
        // Fallback to stable hardcoded rates if the API is down
        // This is a "Production Best Practice" to ensure the site never crashes
        return {
            INR: 1,
            USD: 0.012, // 1 USD = ~83 INR
            EUR: 0.011,
            GBP: 0.009,
            CAD: 0.016,
            AUD: 0.018
        };
    }
};

/**
 * Convert an amount from USD/EUR etc. to INR
 */
const convertToINR = async (amount, fromCurrency) => {
    if (fromCurrency === 'INR') {
        return {
            amountINR: Math.round(amount),
            rate: 1
        };
    }

    const rates = await getLatestRates();
    const rateToINR = 1 / (rates[fromCurrency] || 1);
    
    return {
        amountINR: Math.round(amount * rateToINR),
        rate: rateToINR
    };
};

module.exports = {
    getLatestRates,
    convertToINR
};
