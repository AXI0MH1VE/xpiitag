/**
 * XPIITAG - Text Embedder Module
 * Handles metadata encoding in text documents
 */

const TextEmbedder = (function() {
    // Magic markers for text watermarking
    const MARKER_START = '[[XPIITAG:';
    const MARKER_END = ']]';
    const BASE64_REGEX = /^[A-Za-z0-9+/]+=*$/;
    
    /**
     * Embed metadata into text using invisible markers
     * @param {string} text - Original text
     * @param {object} metadata - Metadata to embed
     * @returns {string} - Text with embedded metadata
     */
    function embed(text, metadata) {
        // Serialize metadata to JSON and encode as base64
        const metadataStr = JSON.stringify(metadata);
        const encoded = base64Encode(metadataStr);
        
        // Create watermarked text
        const watermark = `${MARKER_START}${encoded}${MARKER_END}`;
        
        // Append watermark to end of text (or in a less visible location)
        // Using a subtle approach - adding at the end with a section header
        const watermarkedText = text + '\n\n---\nXPIITAG Attribution: ' + watermark;
        
        return watermarkedText;
    }
    
    /**
     * Extract metadata from text
     * @param {string} text - Text to extract from
     * @returns {object|null} - Extracted metadata or null
     */
    function extract(text) {
        // Find watermark markers
        const startIdx = text.indexOf(MARKER_START);
        const endIdx = text.indexOf(MARKER_END);
        
        if (startIdx === -1 || endIdx === -1) {
            return null;
        }
        
        try {
            const encoded = text.substring(startIdx + MARKER_START.length, endIdx);
            const decoded = base64Decode(encoded);
            return JSON.parse(decoded);
        } catch (e) {
            console.error('Failed to extract metadata from text:', e);
            return null;
        }
    }
    
    /**
     * Check if text contains watermark
     * @param {string} text - Text to check
     * @returns {boolean} - True if watermark detected
     */
    function hasWatermark(text) {
        return text.includes(MARKER_START) && text.includes(MARKER_END);
    }
    
    /**
     * Remove watermark from text
     * @param {string} text - Text with watermark
     * @returns {string} - Clean text
     */
    function remove(text) {
        const watermarkPattern = /\n\n---\nXPIITAG Attribution: \[\[XPIITAG:[A-Za-z0-9+/]+=*\]\]/g;
        return text.replace(watermarkPattern, '');
    }
    
    /**
     * Base64 encode (browser-compatible)
     * @param {string} str - String to encode
     * @returns {string} - Base64 encoded string
     */
    function base64Encode(str) {
        // Use browser's btoa with Unicode support
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
            // Fallback for Node.js or other environments
            return Buffer.from(str, 'utf-8').toString('base64');
        }
    }
    
    /**
     * Base64 decode (browser-compatible)
     * @param {string} b64 - Base64 string to decode
     * @returns {string} - Decoded string
     */
    function base64Decode(b64) {
        try {
            return decodeURIComponent(escape(atob(b64)));
        } catch (e) {
            // Fallback for Node.js or other environments
            return Buffer.from(b64, 'base64').toString('utf-8');
        }
    }
    
    /**
     * Create semantic color mapping for text attribution
     * This creates colored text markers that can be detected
     * @param {string} text - Original text
     * @param {object} metadata - Metadata to embed
     * @returns {string} - HTML with colored attribution
     */
    function embedWithColor(text, metadata) {
        const encoded = base64Encode(JSON.stringify(metadata));
        
        // Create invisible colored spans (same as background)
        // This is a fallback for HTML documents
        const colorEncoded = createColorCodedString(encoded);
        
        return {
            text: text,
            hiddenMarker: `${MARKER_START}${encoded}${MARKER_END}`,
            colorMarker: colorEncoded
        };
    }
    
    /**
     * Create color-coded string for additional watermark layer
     * Each character's color represents bits of data
     * @param {string} data - Data to encode
     * @returns {string} - HTML string with color spans
     */
    function createColorCodedString(data) {
        // For each character, create a span with subtle color variation
        // Using very subtle gray variations (almost invisible)
        let html = '';
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i);
            // Use least significant bits for color
            const gray = 20 + (charCode % 10); // Very dark gray (20-30)
            html += `<span style="color:rgb(${gray},${gray},${gray})">${data[i]}</span>`;
        }
        return html;
    }
    
    /**
     * Embed in Markdown-specific format
     * @param {string} markdown - Markdown content
     * @param {object} metadata - Metadata to embed
     * @returns {string} - Markdown with embedded metadata
     */
    function embedMarkdown(markdown, metadata) {
        const metadataStr = JSON.stringify(metadata);
        const encoded = base64Encode(metadataStr);
        
        // Use HTML comment for clean markdown
        const watermark = `<!-- XPIITAG:${encoded} -->`;
        
        // Append at the end in a comment block
        return markdown + '\n\n' + watermark;
    }
    
    /**
     * Extract from Markdown
     * @param {string} markdown - Markdown content
     * @returns {object|null} - Extracted metadata
     */
    function extractMarkdown(markdown) {
        const pattern = /<!--\s*XPIITAG:([A-Za-z0-9+/=]+)\s*-->/;
        const match = markdown.match(pattern);
        
        if (!match) {
            return null;
        }
        
        try {
            const decoded = base64Decode(match[1]);
            return JSON.parse(decoded);
        } catch (e) {
            console.error('Failed to extract from Markdown:', e);
            return null;
        }
    }
    
    /**
     * Embed in JSON document
     * @param {object} jsonObj - JSON object
     * @param {object} metadata - Metadata to embed
     * @returns {string} - JSON string with embedded metadata
     */
    function embedJSON(jsonObj, metadata) {
        // Add metadata as a special field
        const metadataStr = JSON.stringify(metadata);
        const encoded = base64Encode(metadataStr);
        
        const result = {
            ...jsonObj,
            _xpiitag: encoded
        };
        
        return JSON.stringify(result, null, 2);
    }
    
    /**
     * Extract from JSON document
     * @param {string} jsonStr - JSON string
     * @returns {object|null} - Extracted metadata
     */
    function extractJSON(jsonStr) {
        try {
            const obj = JSON.parse(jsonStr);
            
            if (!obj._xpiitag) {
                return null;
            }
            
            const decoded = base64Decode(obj._xpiitag);
            return JSON.parse(decoded);
        } catch (e) {
            console.error('Failed to extract from JSON:', e);
            return null;
        }
    }
    
    /**
     * Create attribution signature
     * @param {object} config - Configuration object
     * @returns {string} - Attribution string
     */
    function createAttribution(config) {
        const attribution = {
            model: config.model,
            provider: config.provider,
            timestamp: config.timestamp || new Date().toISOString(),
            version: '1.0'
        };
        
        const encoded = base64Encode(JSON.stringify(attribution));
        
        return `Generated by ${config.provider}/${config.model} | XPIITAG: ${encoded}`;
    }
    
    /**
     * Detect content type from text
     * @param {string} text - Text content
     * @returns {string} - Content type: 'markdown', 'json', or 'plain'
     */
    function detectContentType(text) {
        const trimmed = text.trim();
        
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                JSON.parse(trimmed);
                return 'json';
            } catch {}
        }
        
        if (trimmed.includes('# ') || trimmed.includes('## ') || 
            trimmed.includes('**') || trimmed.includes('```')) {
            return 'markdown';
        }
        
        return 'plain';
    }
    
    /**
     * Auto-embed based on content type
     * @param {string} content - Content to embed in
     * @param {object} metadata - Metadata to embed
     * @returns {string} - Content with embedded metadata
     */
    function autoEmbed(content, metadata) {
        const contentType = detectContentType(content);
        
        switch (contentType) {
            case 'json':
                try {
                    const obj = JSON.parse(content);
                    return embedJSON(obj, metadata);
                } catch {
                    return embed(content, metadata);
                }
            case 'markdown':
                return embedMarkdown(content, metadata);
            default:
                return embed(content, metadata);
        }
    }
    
    /**
     * Auto-extract based on content
     * @param {string} content - Content to extract from
     * @returns {object|null} - Extracted metadata
     */
    function autoExtract(content) {
        const contentType = detectContentType(content);
        
        let metadata = null;
        
        switch (contentType) {
            case 'json':
                metadata = extractJSON(content);
                if (metadata) return metadata;
                break;
            case 'markdown':
                metadata = extractMarkdown(content);
                if (metadata) return metadata;
                break;
        }
        
        // Fallback to plain text extraction
        return extract(content);
    }
    
    // Public API
    return {
        embed,
        extract,
        hasWatermark,
        remove,
        embedMarkdown,
        extractMarkdown,
        embedJSON,
        extractJSON,
        embedWithColor,
        createAttribution,
        detectContentType,
        autoEmbed,
        autoExtract,
        MARKER_START,
        MARKER_END
    };
})();

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextEmbedder;
}
