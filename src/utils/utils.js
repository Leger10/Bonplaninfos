import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const fetchWithRetry = async (fetchFunction, ...args) => {
  // Détection de la signature
  let maxRetries, baseDelay, shouldRetry;
  
  if (typeof args[0] === 'number') {
    // Ancienne signature : (fetchFunction, retries, delay)
    maxRetries = args[0] || 3;
    baseDelay = args[1] || 1000;
    shouldRetry = (error) => true;
  } else {
    // Nouvelle signature : (fetchFunction, { maxRetries, baseDelay, shouldRetry })
    const options = args[0] || {};
    maxRetries = options.maxRetries || 3;
    baseDelay = options.baseDelay || 1000;
    shouldRetry = options.shouldRetry || ((error) => true);
  }
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchFunction();
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (!shouldRetry(error) || attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;
      const delay = exponentialDelay + jitter;
      
      console.warn(`Fetch attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

export const formatCurrency = (amount, currency = 'XOF') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};