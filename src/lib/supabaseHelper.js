import { toast } from "@/components/ui/use-toast";

/**
 * Normalizes various error formats (Supabase, Network, Standard Error) into a consistent shape.
 */
const normalizeError = (error) => {
  if (!error) return null;

  // Handle Network Errors (TypeError: Failed to fetch)
  // Also catch "NetworkError" string which some browsers use
  if (
    error.message === "Failed to fetch" || 
    error.name === "TypeError" || 
    (error.message && error.message.includes("NetworkError"))
  ) {
    return {
      message: "Erreur de connexion réseau. Vérifiez votre connexion internet.",
      code: "NETWORK_ERROR",
      details: error.message,
      isNetworkError: true
    };
  }

  // Handle Supabase Errors
  return {
    message: error.message || "Une erreur inconnue est survenue",
    code: error.code || error.name || "UNKNOWN_ERROR",
    details: error.details || error.hint || null,
    isNetworkError: false
  };
};

/**
 * Retries a Supabase request on network failure and normalizes the output.
 * Returns { data, error, count } - never throws.
 * 
 * @param {Function} requestFn - Function that returns a Supabase promise
 * @param {number} retries - Number of retries for network errors
 * @param {number} delay - Initial delay in ms
 */
export const retrySupabaseRequest = async (requestFn, retries = 3, delay = 1000) => {
  try {
    // Circuit breaker: Don't even try if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
       throw new Error("Failed to fetch"); // Throw to trigger catch block normalization
    }

    const result = await requestFn();

    // Check if Supabase returned an error object (Supabase client doesn't always throw)
    if (result && result.error) {
      return { 
        data: null, 
        error: normalizeError(result.error),
        count: null
      };
    }

    return { 
      data: result.data, 
      error: null, 
      count: result.count 
    };

  } catch (error) {
    const normalized = normalizeError(error);

    // Retry ONLY on network errors
    if (normalized.isNetworkError && retries > 0) {
      console.warn(`Network error detected. Retrying request... (${retries} attempts left)`);
      // Exponential backoff: 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, delay));
      return retrySupabaseRequest(requestFn, retries - 1, delay * 2);
    }

    // Return normalized error instead of throwing to prevent Promise.all failures
    return { 
      data: null, 
      error: normalized,
      count: null
    };
  }
};

/**
 * Wrapper for Supabase queries that handles retries and returns a standard format.
 * Safe to use in useEffects.
 */
export const safeFetch = async (queryFn, fallback = []) => {
    const { data, error } = await retrySupabaseRequest(queryFn);
    
    if (error) {
        console.error("SafeFetch Error:", error);
        return { data: fallback, error };
    }
    
    return { data: data || fallback, error: null };
};