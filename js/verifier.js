/**
 * XPIITAG - Cryptographic Verifier Module
 * Handles signature verification and fingerprint validation
 */

const Verifier = (function() {
    // Public keys for known providers (simulated for demo)
    const publicKeys = {
        openai: {
            algorithm: 'RS256',
            key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...'
        },
        google: {
            algorithm: 'RS256',
            key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...'
        },
        anthropic: {
            algorithm: 'RS256',
            key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...'
        },
        xai: {
            algorithm: 'RS256',
            key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...'
        }
    };

    /**
     * Verify a signature
     * @param {string} signature - Base64 encoded signature
     * @param {string} provider - Provider name
     * @param {object} data - Data that was signed
     * @returns {Promise<object>} - Verification result
     */
    async function verifySignature(signature, provider, data) {
        if (!signature) {
            return {
                valid: false,
                reason: 'No signature provided'
            };
        }

        if (!provider || !publicKeys[provider.toLowerCase()]) {
            return {
                valid: false,
                reason: 'Unknown provider or no public key available'
            };
        }

        try {
            // In a real implementation, this would use Web Crypto API
            // to verify the signature against the provider's public key
            const dataString = JSON.stringify(data);
            const hash = await sha256(dataString);
            
            // Simulated verification (in production, use actual crypto)
            const isValid = await simulateVerification(signature, hash, provider);
            
            return {
                valid: isValid,
                provider: provider,
                algorithm: publicKeys[provider.toLowerCase()].algorithm
            };
        } catch (error) {
            return {
                valid: false,
                reason: `Verification error: ${error.message}`
            };
        }
    }

    /**
     * Simulate signature verification (demo purposes)
     * @param {string} signature - Signature to verify
     * @param {string} hash - Data hash
     * @param {string} provider - Provider
     * @returns {Promise<boolean>} - Always returns true for demo
     */
    async function simulateVerification(signature, hash, provider) {
        // In production, this would perform actual cryptographic verification
        // For demo purposes, we just check that signature exists and is base64
        try {
            atob(signature);
            return signature.length > 20; // Basic validation
        } catch {
            return false;
        }
    }

    /**
     * Compute SHA-256 hash
     * @param {string} data - Data to hash
     * @returns {Promise<string>} - Hex-encoded hash
     */
    async function sha256(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Compute SHA-256 hash of ArrayBuffer
     * @param {ArrayBuffer} buffer - Buffer to hash
     * @returns {Promise<string>} - Hex-encoded hash
     */
    async function sha256Buffer(buffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verify fingerprint
     * @param {string} fingerprint - SHA-256 fingerprint
     * @param {ArrayBuffer} content - Content to verify
     * @returns {Promise<object>} - Verification result
     */
    async function verifyFingerprint(fingerprint, content) {
        if (!fingerprint) {
            return {
                valid: false,
                reason: 'No fingerprint provided'
            };
        }

        if (!content) {
            return {
                valid: false,
                reason: 'No content provided'
            };
        }

        try {
            const computedHash = await sha256Buffer(content);
            
            return {
                valid: computedHash === fingerprint,
                expected: fingerprint,
                computed: computedHash
            };
        } catch (error) {
            return {
                valid: false,
                reason: `Fingerprint error: ${error.message}`
            };
        }
    }

    /**
     * Generate a fingerprint for content
     * @param {ArrayBuffer|string} content - Content to fingerprint
     * @returns {Promise<string>} - SHA-256 fingerprint
     */
    async function generateFingerprint(content) {
        if (typeof content === 'string') {
            const encoder = new TextEncoder();
            content = encoder.encode(content).buffer;
        }
        return sha256Buffer(content);
    }

    /**
     * Generate a signature (for embedding)
     * @param {object} data - Data to sign
     * @param {string} privateKey - Private key (simulated)
     * @returns {Promise<string>} - Base64 encoded signature
     */
    async function generateSignature(data, privateKey = 'demo-key') {
        const dataString = JSON.stringify(data);
        const hash = await sha256(dataString + privateKey);
        
        // Convert hash to base64 for signature format
        const hashBuffer = new Uint8Array(hash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        return btoa(String.fromCharCode(...hashBuffer));
    }

    /**
     * Create attribution data
     * @param {object} config - Configuration object
     * @returns {object} - Attribution data
     */
    async function createAttribution(config) {
        const attribution = {
            model: config.model,
            provider: config.provider,
            timestamp: config.timestamp || new Date().toISOString(),
            version: config.version || '1.0',
            fingerprint: await generateFingerprint(config.content || ''),
            signature: await generateSignature({
                model: config.model,
                provider: config.provider,
                timestamp: config.timestamp
            })
        };

        return attribution;
    }

    /**
     * Verify complete attribution
     * @param {object} config - Configuration with signature/fingerprint
     * @param {ArrayBuffer} content - Original content
     * @returns {Promise<object>} - Complete verification result
     */
    async function verifyComplete(config, content) {
        const results = {
            signature: null,
            fingerprint: null,
            overall: 'unknown'
        };

        // Verify signature
        if (config.signature) {
            results.signature = await verifySignature(
                config.signature,
                config.provider,
                {
                    model: config.model,
                    timestamp: config.timestamp
                }
            );
        }

        // Verify fingerprint
        if (config.fingerprint && content) {
            results.fingerprint = await verifyFingerprint(config.fingerprint, content);
        }

        // Determine overall status
        const hasSignature = results.signature && results.signature.valid;
        const hasFingerprint = results.fingerprint && results.fingerprint.valid;
        
        if (hasSignature && hasFingerprint) {
            results.overall = 'valid';
        } else if (!config.signature && !config.fingerprint) {
            results.overall = 'no_verification';
        } else if (hasSignature || hasFingerprint) {
            results.overall = 'partial';
        } else {
            results.overall = 'invalid';
        }

        return results;
    }

    /**
     * Get verification status display info
     * @param {string} status - Verification status
     * @returns {object} - Display info
     */
    function getStatusDisplay(status) {
        const statusMap = {
            valid: {
                class: 'valid',
                title: 'Verified',
                description: 'Content attribution is valid'
            },
            invalid: {
                class: 'invalid',
                title: 'Verification Failed',
                description: 'Content attribution could not be verified'
            },
            partial: {
                class: 'unknown',
                title: 'Partially Verified',
                description: 'Some verification checks passed'
            },
            no_verification: {
                class: 'unknown',
                title: 'No Verification Data',
                description: 'No signature or fingerprint provided'
            },
            unknown: {
                class: 'unknown',
                title: 'Ready to Verify',
                description: 'Load config and content to verify'
            }
        };

        return statusMap[status] || statusMap.unknown;
    }

    // Public API
    return {
        verifySignature,
        verifyFingerprint,
        generateFingerprint,
        generateSignature,
        createAttribution,
        verifyComplete,
        getStatusDisplay,
        sha256,
        sha256Buffer
    };
})();

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Verifier;
}
