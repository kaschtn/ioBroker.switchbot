/**
 * Error Handler Utility
 * 
 * Provides comprehensive error handling and retry logic
 */

'use strict';

class ErrorHandler {
    constructor(adapter) {
        this.adapter = adapter;
        this.log = adapter.log;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.baseRetryDelay = 1000; // 1 second
    }

    /**
     * Handle errors with retry logic
     * @param {string} operation - Operation name
     * @param {Function} fn - Function to execute
     * @param {object} context - Context for logging
     * @returns {Promise} - Result or throws error
     */
    async handleWithRetry(operation, fn, context = {}) {
        const key = `${operation}_${JSON.stringify(context)}`;
        const attempts = this.retryAttempts.get(key) || 0;
        
        try {
            const result = await fn();
            
            // Reset retry counter on success
            if (attempts > 0) {
                this.retryAttempts.delete(key);
                this.log.info(`Operation ${operation} succeeded after ${attempts} retries`);
            }
            
            return result;
            
        } catch (error) {
            const newAttempts = attempts + 1;
            this.retryAttempts.set(key, newAttempts);
            
            if (this.shouldRetry(error, newAttempts)) {
                const delay = this.getRetryDelay(newAttempts);
                this.log.warn(`Operation ${operation} failed (attempt ${newAttempts}/${this.maxRetries}): ${error.message}. Retrying in ${delay}ms...`);
                
                await this.sleep(delay);
                return this.handleWithRetry(operation, fn, context);
                
            } else {
                this.retryAttempts.delete(key);
                this.log.error(`Operation ${operation} failed after ${newAttempts} attempts: ${error.message}`);
                throw error;
            }
        }
    }

    /**
     * Determine if error should trigger a retry
     * @param {Error} error - The error object
     * @param {number} attempts - Current attempt count
     * @returns {boolean} - Whether to retry
     */
    shouldRetry(error, attempts) {
        if (attempts >= this.maxRetries) {
            return false;
        }

        // Don't retry authentication errors
        if (error.message.includes('Authentication failed') || 
            error.message.includes('Access forbidden')) {
            return false;
        }

        // Don't retry invalid device/command errors
        if (error.message.includes('Invalid request') ||
            error.message.includes('Unknown device')) {
            return false;
        }

        // Retry network errors and temporary server errors
        if (error.message.includes('Network error') ||
            error.message.includes('timeout') ||
            error.message.includes('Rate limit') ||
            error.message.includes('Internal Server Error')) {
            return true;
        }

        // Default: don't retry
        return false;
    }

    /**
     * Calculate retry delay with exponential backoff
     * @param {number} attempt - Attempt number
     * @returns {number} - Delay in milliseconds
     */
    getRetryDelay(attempt) {
        return Math.min(this.baseRetryDelay * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
    }

    /**
     * Sleep for specified duration
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} - Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle API rate limiting
     * @param {Function} fn - Function to execute
     * @param {number} minInterval - Minimum interval between calls (ms)
     * @returns {Promise} - Result of function
     */
    async handleRateLimit(fn, minInterval = 100) {
        const now = Date.now();
        const lastCall = this.lastApiCall || 0;
        const timeSinceLastCall = now - lastCall;
        
        if (timeSinceLastCall < minInterval) {
            const delay = minInterval - timeSinceLastCall;
            await this.sleep(delay);
        }
        
        this.lastApiCall = Date.now();
        return await fn();
    }

    /**
     * Validate configuration
     * @param {object} config - Configuration object
     * @throws {Error} - If configuration is invalid
     */
    validateConfig(config) {
        const errors = [];
        
        if (!config.token || typeof config.token !== 'string' || config.token.trim().length === 0) {
            errors.push('API token is required and must be a non-empty string');
        }
        
        if (!config.secret || typeof config.secret !== 'string' || config.secret.trim().length === 0) {
            errors.push('API secret is required and must be a non-empty string');
        }
        
        if (config.pollInterval !== undefined) {
            const interval = parseInt(config.pollInterval);
            if (isNaN(interval) || interval < 10000) {
                errors.push('Poll interval must be at least 10000ms (10 seconds)');
            }
        }
        
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Safe JSON parse with error handling
     * @param {string} jsonString - JSON string to parse
     * @param {any} defaultValue - Default value if parsing fails
     * @returns {any} - Parsed object or default value
     */
    safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            this.log.debug(`Failed to parse JSON: ${error.message}`);
            return defaultValue;
        }
    }

    /**
     * Safe async operation execution
     * @param {Function} fn - Async function to execute
     * @param {string} operationName - Name for logging
     * @param {any} defaultValue - Default value on error
     * @returns {any} - Function result or default value
     */
    async safeExecute(fn, operationName, defaultValue = null) {
        try {
            return await fn();
        } catch (error) {
            this.log.warn(`Safe execution of ${operationName} failed: ${error.message}`);
            return defaultValue;
        }
    }

    /**
     * Check if error is critical (should stop adapter)
     * @param {Error} error - Error to check
     * @returns {boolean} - Whether error is critical
     */
    isCriticalError(error) {
        const criticalPatterns = [
            'Authentication failed',
            'Access forbidden',
            'Invalid token',
            'Account suspended'
        ];
        
        return criticalPatterns.some(pattern => 
            error.message.includes(pattern)
        );
    }

    /**
     * Log error with appropriate level based on severity
     * @param {Error} error - Error to log
     * @param {string} context - Context information
     */
    logError(error, context = '') {
        const contextStr = context ? ` (${context})` : '';
        
        if (this.isCriticalError(error)) {
            this.log.error(`CRITICAL ERROR${contextStr}: ${error.message}`);
        } else if (error.message.includes('Rate limit') || error.message.includes('timeout')) {
            this.log.warn(`TEMPORARY ERROR${contextStr}: ${error.message}`);
        } else {
            this.log.error(`ERROR${contextStr}: ${error.message}`);
        }
        
        // Log stack trace for debugging
        this.log.debug(`Error stack: ${error.stack}`);
    }

    /**
     * Clean up retry state (call on adapter shutdown)
     */
    cleanup() {
        this.retryAttempts.clear();
        this.lastApiCall = null;
    }
}

module.exports = ErrorHandler;