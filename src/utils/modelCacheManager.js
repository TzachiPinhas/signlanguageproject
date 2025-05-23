/**
 * Utility functions for managing the TensorFlow.js model cache
 * with support for versioning and cross-browser compatibility.
 */

// Cache version constants
const CACHE_VERSION = 'v1.0.2';
const CACHE_KEY_PREFIX = 'sign-language-model-';

/**
 * Generate a versioned cache key for the model
 * 
 * @param {string} modelId - Identifier for the specific model
 * @returns {string} Versioned cache key
 */
export function getVersionedCacheKey(modelId = 'default') {
  return `${CACHE_KEY_PREFIX}${modelId}-${CACHE_VERSION}`;
}

/**
 * Check if a newer model cache exists than the current one
 * 
 * @param {string} currentKey - The current cache key
 * @returns {boolean} True if a newer version exists
 */
export function checkForNewerCache(currentKey) {
  try {
    // Check local storage for metadata about available model versions
    const cacheVersions = getAllCacheVersions();
    
    if (!cacheVersions.length) {
      return false;
    }
    
    // Get current version number from key
    const currentVersion = extractVersionNumber(currentKey);
    
    // Find highest version number in cache
    const newestVersion = cacheVersions.reduce((highest, key) => {
      const version = extractVersionNumber(key);
      return version > highest ? version : highest;
    }, 0);
    
    return newestVersion > currentVersion;
  } catch (err) {
    console.warn('Error checking for newer cache:', err.message);
    return false;
  }
}

/**
 * Get a list of all cached model versions
 * 
 * @returns {Array<string>} List of cache keys
 */
export function getAllCacheVersions() {
  const cacheKeys = [];
  
  // Check localStorage for model metadata
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(CACHE_KEY_PREFIX) && key.includes('-metadata')) {
        cacheKeys.push(key.replace('-metadata', ''));
      }
    }
  } catch (e) {
    console.warn('Error accessing localStorage:', e.message);
  }
  
  return cacheKeys;
}

/**
 * Extract version number from cache key
 * 
 * @param {string} cacheKey - The cache key
 * @returns {number} The version number
 */
function extractVersionNumber(cacheKey) {
  try {
    const versionPart = cacheKey.split('-').pop().replace('v', '');
    return parseFloat(versionPart) || 0;
  } catch {
    return 0;
  }
}

/**
 * Clear all older versions of the model from cache
 * 
 * @param {string} currentKey - The current cache key to keep
 * @returns {Promise<void>}
 */
export async function clearOldCacheVersions(currentKey) {
  try {
    const tf = await import('@tensorflow/tfjs');
    
    // Get all cache versions
    const allVersions = getAllCacheVersions();
    
    // Filter out the current version
    const oldVersions = allVersions.filter(key => key !== currentKey);
    
    // Clear each older version
    for (const key of oldVersions) {
      try {
        // Try to clear from IndexedDB
        await tf.io.removeModel(`indexeddb://${key}`);
        console.log(`Cleared old model from IndexedDB: ${key}`);
      } catch (e) {
        console.warn(`Failed to clear IndexedDB for ${key}:`, e.message);
      }
      
      try {
        // Try to clear from localStorage
        await tf.io.removeModel(`localstorage://${key}`);
        console.log(`Cleared old model from localStorage: ${key}`);
      } catch (e) {
        console.warn(`Failed to clear localStorage for ${key}:`, e.message);
      }
      
      // Clear metadata
      try {
        localStorage.removeItem(`${key}-metadata`);
      } catch (e) {
        console.warn(`Failed to clear metadata for ${key}:`, e.message);
      }
    }
    
    console.log(`Cleared ${oldVersions.length} old model cache versions`);
  } catch (err) {
    console.error('Error clearing old cache versions:', err);
  }
}
