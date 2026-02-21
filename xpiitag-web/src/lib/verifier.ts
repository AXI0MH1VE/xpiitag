/**
 * Verification Engine
 * Cryptographic validation and fingerprinting for metadata
 */

import CryptoJS from 'crypto-js';

export interface VerificationResult {
  valid: boolean;
  tampered: boolean;
  provider?: string;
  model?: string;
  timestamp?: string;
  fingerprint?: string;
  errors: string[];
  warnings: string[];
}

export interface XPIIMetadata {
  version: string;
  provider: string;
  model: string;
  timestamp: string;
  fingerprint: string;
  signature?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
}

export class Verifier {
  /**
   * Verifies the integrity and authenticity of XPII metadata
   */
  static verify(metadata: unknown): VerificationResult {
    const result: VerificationResult = {
      valid: false,
      tampered: false,
      errors: [],
      warnings: []
    };
    
    try {
      // Validate structure
      if (!this.isValidStructure(metadata)) {
        result.errors.push('Invalid metadata structure');
        return result;
      }
      
      const xpii = metadata as XPIIMetadata;
      
      // Check required fields
      const requiredFields = ['version', 'provider', 'model', 'timestamp', 'fingerprint'];
      for (const field of requiredFields) {
        if (!(field in xpii)) {
          result.errors.push(`Missing required field: ${field}`);
        }
      }
      
      if (result.errors.length > 0) {
        return result;
      }
      
      // Set basic info
      result.provider = xpii.provider;
      result.model = xpii.model;
      result.timestamp = xpii.timestamp;
      result.fingerprint = xpii.fingerprint;
      
      // Validate version
      if (!this.isValidVersion(xpii.version)) {
        result.warnings.push(`Unknown version: ${xpii.version}`);
      }
      
      // Validate timestamp
      if (!this.isValidTimestamp(xpii.timestamp)) {
        result.errors.push('Invalid timestamp format');
      }
      
      // Validate fingerprint format
      if (!this.isValidFingerprint(xpii.fingerprint)) {
        result.errors.push('Invalid fingerprint format');
      }
      
      // Verify content hash if present
      if (xpii.contentHash) {
        if (!this.isValidContentHash(xpii.contentHash)) {
          result.warnings.push('Invalid content hash format');
        }
      }
      
      // Verify signature if present
      if (xpii.signature) {
        const sigValid = this.verifySignature(xpii);
        if (!sigValid) {
          result.tampered = true;
          result.errors.push('Signature verification failed - data may be tampered');
        }
      } else {
        result.warnings.push('No digital signature present');
      }
      
      // Check if timestamp is recent (within last 30 days)
      const timestamp = new Date(xpii.timestamp);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (timestamp < thirtyDaysAgo) {
        result.warnings.push('Timestamp is older than 30 days');
      }
      
      // Check if timestamp is in the future
      if (timestamp > new Date()) {
        result.errors.push('Timestamp is in the future');
      }
      
      // Set final validity
      result.valid = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Generates a SHA-256 fingerprint for content
   */
  static generateFingerprint(content: string): string {
    return CryptoJS.SHA256(content).toString();
  }
  
  /**
   * Generates a content hash for verification
   */
  static generateContentHash(content: string | ArrayBuffer): string {
    if (typeof content === 'string') {
      return CryptoJS.SHA256(content).toString();
    } else {
      // Convert ArrayBuffer to WordArray
      const wordArray = CryptoJS.lib.WordArray.create(content as any);
      return CryptoJS.SHA256(wordArray).toString();
    }
  }
  
  /**
   * Creates a complete XPII metadata object
   */
  static createMetadata(
    provider: string,
    model: string,
    content: string | ArrayBuffer,
    additionalMetadata?: Record<string, unknown>
  ): XPIIMetadata {
    const timestamp = new Date().toISOString();
    const contentHash = this.generateContentHash(content);
    
    const metadata: XPIIMetadata = {
      version: '1.0',
      provider,
      model,
      timestamp,
      fingerprint: contentHash,
      contentHash,
      ...additionalMetadata
    };
    
    // Generate signature (in production, this would use private key)
    metadata.signature = this.generateSignature(metadata);
    
    return metadata;
  }
  
  /**
   * Validates metadata structure
   */
  private static isValidStructure(metadata: unknown): metadata is XPIIMetadata {
    return (
      typeof metadata === 'object' &&
      metadata !== null &&
      'version' in metadata &&
      'provider' in metadata &&
      'model' in metadata &&
      'timestamp' in metadata &&
      'fingerprint' in metadata
    );
  }
  
  /**
   * Validates version format
   */
  private static isValidVersion(version: string): boolean {
    return /^\\d+\\.\\d+$/.test(version);
  }
  
  /**
   * Validates ISO 8601 timestamp
   */
  private static isValidTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(timestamp);
  }
  
  /**
   * Validates SHA-256 fingerprint format
   */
  private static isValidFingerprint(fingerprint: string): boolean {
    return /^[a-f0-9]{64}$/i.test(fingerprint);
  }
  
  /**
   * Validates content hash format
   */
  private static isValidContentHash(hash: string): boolean {
    return /^[a-f0-9]{64}$/i.test(hash);
  }
  
  /**
   * Verifies digital signature (placeholder implementation)
   */
  private static verifySignature(metadata: XPIIMetadata): boolean {
    // In production, this would verify against provider's public key
    // For now, we just check if signature exists and has valid format
    if (!metadata.signature) return false;
    
    // Basic format validation
    return metadata.signature.length > 0;
  }
  
  /**
   * Generates a signature (placeholder implementation)
   */
  private static generateSignature(metadata: XPIIMetadata): string {
    // In production, this would use RSA/ECDSA with private key
    // For demo, we create a hash of the metadata
    const data = JSON.stringify({
      version: metadata.version,
      provider: metadata.provider,
      model: metadata.model,
      timestamp: metadata.timestamp,
      fingerprint: metadata.fingerprint
    });
    
    return CryptoJS.HmacSHA256(data, 'demo-key').toString();
  }
  
  /**
   * Gets provider info from metadata
   */
  static getProviderInfo(metadata: XPIIMetadata): {
    name: string;
    trustLevel: 'high' | 'medium' | 'low' | 'unknown';
  } {
    const trustedProviders = ['openai', 'google', 'anthropic', 'xai'];
    const providerId = metadata.provider.toLowerCase().replace(/\\s+/g, '');
    
    if (trustedProviders.includes(providerId)) {
      return { name: metadata.provider, trustLevel: 'high' };
    }
    
    return { name: metadata.provider, trustLevel: 'unknown' };
  }
}
