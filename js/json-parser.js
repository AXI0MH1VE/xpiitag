/**
 * XPIITAG - JSON Parser Module
 * Handles JSON validation, parsing, and provider mapping
 */

const JSONParser = (function() {
    // JSON Schema for validation
    const schema = {
        required: ['model', 'provider', 'timestamp'],
        optional: ['signature', 'fingerprint', 'version'],
        types: {
            model: 'string',
            provider: 'string',
            timestamp: 'string',
            signature: 'string',
            fingerprint: 'string',
            version: 'string'
        }
    };

    // Known AI providers
    const providers = {
        openai: {
            name: 'OpenAI',
            models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview'],
            color: '#10a37f'
        },
        google: {
            name: 'Google',
            models: ['gemini-pro', 'gemini-ultra', 'gemini-1.5-pro', 'gemini-1.5-flash'],
            color: '#4285f4'
        },
        anthropic: {
            name: 'Anthropic',
            models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3.5-sonnet'],
            color: '#d97757'
        },
        xai: {
            name: 'xAI',
            models: ['grok-1', 'grok-1.5', 'grok-beta'],
            color: '#000000'
        },
        meta: {
            name: 'Meta',
            models: ['llama-2', 'llama-3', 'llama-3.1'],
            color: '#0668e1'
        },
        mistral: {
            name: 'Mistral',
            models: ['mistral-large', 'mistral-medium', 'mistral-small'],
            color: '#ff7000'
        },
        cohere: {
            name: 'Cohere',
            models: ['command-r', 'command-r-plus', 'c4ai--command-r'],
            color: '#39594d'
        },
        custom: {
            name: 'Custom',
            models: [],
            color: '#8b949e'
        }
    };

    /**
     * Validate JSON string against schema
     * @param {string} jsonString - JSON string to validate
     * @returns {object} - Validation result
     */
    function validate(jsonString) {
        if (!jsonString || typeof jsonString !== 'string') {
            return {
                valid: false,
                error: 'Input must be a non-empty string'
            };
        }

        try {
            const parsed = JSON.parse(jsonString);
            return validateObject(parsed);
        } catch (e) {
            return {
                valid: false,
                error: `Invalid JSON: ${e.message}`,
                rawError: e.message
            };
        }
    }

    /**
     * Validate parsed JSON object against schema
     * @param {object} obj - Parsed JSON object
     * @returns {object} - Validation result
     */
    function validateObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return {
                valid: false,
                error: 'Input must be a valid JSON object'
            };
        }

        // Check required fields
        for (const field of schema.required) {
            if (!(field in obj)) {
                return {
                    valid: false,
                    error: `Missing required field: ${field}`
                };
            }
        }

        // Validate field types
        for (const [field, type] of Object.entries(schema.types)) {
            if (field in obj && typeof obj[field] !== type) {
                return {
                    valid: false,
                    error: `Field '${field}' must be of type ${type}`
                };
            }
        }

        // Validate timestamp format (ISO 8601)
        if (obj.timestamp) {
            const timestamp = new Date(obj.timestamp);
            if (isNaN(timestamp.getTime())) {
                return {
                    valid: false,
                    error: 'Invalid timestamp format. Use ISO 8601 format.'
                };
            }
        }

        // Validate provider
        if (obj.provider && !providers[obj.provider.toLowerCase()]) {
            console.warn(`Unknown provider: ${obj.provider}`);
        }

        return {
            valid: true,
            data: obj,
            warnings: getWarnings(obj)
        };
    }

    /**
     * Get warnings for potential issues
     * @param {object} obj - Parsed JSON object
     * @returns {array} - List of warnings
     */
    function getWarnings(obj) {
        const warnings = [];

        if (!obj.signature) {
            warnings.push('No signature provided - verification will be limited');
        }

        if (!obj.fingerprint) {
            warnings.push('No fingerprint provided - cannot verify content integrity');
        }

        if (!obj.version) {
            warnings.push('No version specified - assuming latest format');
        }

        // Check timestamp is not in the future
        if (obj.timestamp) {
            const timestamp = new Date(obj.timestamp);
            const now = new Date();
            if (timestamp > now) {
                warnings.push('Timestamp is in the future');
            }
        }

        return warnings;
    }

    /**
     * Parse and normalize JSON data
     * @param {string} jsonString - JSON string to parse
     * @returns {object} - Normalized data
     */
    function parse(jsonString) {
        const validation = validate(jsonString);
        
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const data = validation.data;
        
        return {
            model: data.model,
            provider: data.provider.toLowerCase(),
            providerInfo: getProviderInfo(data.provider),
            timestamp: new Date(data.timestamp).toISOString(),
            signature: data.signature || null,
            fingerprint: data.fingerprint || null,
            version: data.version || '1.0',
            warnings: validation.warnings
        };
    }

    /**
     * Get provider information
     * @param {string} providerName - Provider name (case-insensitive)
     * @returns {object} - Provider info
     */
    function getProviderInfo(providerName) {
        const key = providerName.toLowerCase();
        return providers[key] || providers.custom;
    }

    /**
     * Get all supported providers
     * @returns {array} - List of provider keys
     */
    function getProviders() {
        return Object.keys(providers);
    }

    /**
     * Format parsed data for display
     * @param {object} data - Parsed data
     * @returns {object} - Formatted display data
     */
    function formatForDisplay(data) {
        return {
            model: data.model,
            provider: data.providerInfo.name,
            providerColor: data.providerInfo.color,
            timestamp: formatTimestamp(data.timestamp),
            fingerprint: data.fingerprint ? truncateHash(data.fingerprint) : 'Not provided',
            signature: data.signature ? 'Present' : 'Not provided',
            version: data.version
        };
    }

    /**
     * Format timestamp for display
     * @param {string} isoString - ISO timestamp
     * @returns {string} - Formatted timestamp
     */
    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Truncate hash for display
     * @param {string} hash - Full hash
     * @returns {string} - Truncated hash
     */
    function truncateHash(hash) {
        if (!hash || hash.length < 16) return hash;
        return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    }

    /**
     * Create JSON config template
     * @param {string} provider - Provider name
     * @param {string} model - Model name
     * @returns {string} - JSON template
     */
    function createTemplate(provider = 'openai', model = 'gpt-4') {
        const template = {
            model: model,
            provider: provider,
            timestamp: new Date().toISOString(),
            signature: '',
            fingerprint: '',
            version: '1.0'
        };
        return JSON.stringify(template, null, 2);
    }

    // Public API
    return {
        validate,
        validateObject,
        parse,
        getProviders,
        getProviderInfo,
        formatForDisplay,
        createTemplate
    };
})();

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JSONParser;
}
