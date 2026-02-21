/**
 * XPIITAG - Document Processor Module
 * Handles PDF, Markdown, and JSON document processing
 */

const DocumentProcessor = (function() {
    // Supported document types
    const TYPES = {
        markdown: {
            extensions: ['.md', '.markdown'],
            mime: 'text/markdown',
            processor: processMarkdown
        },
        json: {
            extensions: ['.json'],
            mime: 'application/json',
            processor: processJSON
        },
        pdf: {
            extensions: ['.pdf'],
            mime: 'application/pdf',
            processor: processPDF
        },
        text: {
            extensions: ['.txt', '.text'],
            mime: 'text/plain',
            processor: processText
        }
    };
    
    /**
     * Get document type from extension
     * @param {string} extension - File extension
     * @returns {string} - Document type
     */
    function getType(extension) {
        const ext = extension.toLowerCase().startsWith('.') ? extension : '.' + extension;
        
        for (const [type, config] of Object.entries(TYPES)) {
            if (config.extensions.includes(ext)) {
                return type;
            }
        }
        
        return 'text';
    }
    
    /**
     * Process document based on type
     * @param {string} content - Document content
     * @param {string} extension - File extension
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Processing result
     */
    function process(content, extension, metadata) {
        const type = getType(extension);
        const processor = TYPES[type]?.processor;
        
        if (!processor) {
            throw new Error(`Unsupported document type: ${extension}`);
        }
        
        return processor(content, metadata);
    }
    
    /**
     * Extract metadata from document
     * @param {string} content - Document content
     * @param {string} extension - File extension
     * @returns {object|null} - Extracted metadata
     */
    function extract(content, extension) {
        const type = getType(extension);
        
        switch (type) {
            case 'markdown':
                return extractMarkdown(content);
            case 'json':
                return extractJSON(content);
            case 'text':
                return extractText(content);
            default:
                return null;
        }
    }
    
    /**
     * Process Markdown document
     * @param {string} markdown - Markdown content
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Processing result
     */
    function processMarkdown(markdown, metadata) {
        // Use text embedder for Markdown
        const watermarked = TextEmbedder.embedMarkdown(markdown, metadata);
        
        return {
            content: watermarked,
            type: 'markdown',
            extension: '.md'
        };
    }
    
    /**
     * Extract from Markdown
     * @param {string} markdown - Markdown content
     * @returns {object|null} - Extracted metadata
     */
    function extractMarkdown(markdown) {
        // Try HTML comment first
        const commentMatch = markdown.match(/<!--\s*XPIITAG:([A-Za-z0-9+/=]+)\s*-->/);
        if (commentMatch) {
            try {
                return JSON.parse(atob(commentMatch[1]));
            } catch {}
        }
        
        // Try text markers
        return TextEmbedder.extractMarkdown(markdown);
    }
    
    /**
     * Process JSON document
     * @param {string} jsonStr - JSON content
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Processing result
     */
    function processJSON(jsonStr, metadata) {
        try {
            const obj = JSON.parse(jsonStr);
            const watermarked = TextEmbedder.embedJSON(obj, metadata);
            
            return {
                content: watermarked,
                type: 'json',
                extension: '.json'
            };
        } catch (e) {
            throw new Error(`Invalid JSON: ${e.message}`);
        }
    }
    
    /**
     * Extract from JSON
     * @param {string} jsonStr - JSON content
     * @returns {object|null} - Extracted metadata
     */
    function extractJSON(jsonStr) {
        return TextEmbedder.extractJSON(jsonStr);
    }
    
    /**
     * Process plain text document
     * @param {string} text - Text content
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Processing result
     */
    function processText(text, metadata) {
        const watermarked = TextEmbedder.embed(text, metadata);
        
        return {
            content: watermarked,
            type: 'text',
            extension: '.txt'
        };
    }
    
    /**
     * Extract from plain text
     * @param {string} text - Text content
     * @returns {object|null} - Extracted metadata
     */
    function extractText(text) {
        return TextEmbedder.extract(text);
    }
    
    /**
     * Process PDF document (basic metadata embedding)
     * Note: Full PDF processing would require a library like pdf-lib
     * @param {ArrayBuffer} buffer - PDF file buffer
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Processing result
     */
    function processPDF(buffer, metadata) {
        // Convert to Uint8Array for manipulation
        const uint8Array = new Uint8Array(buffer);
        
        // Convert to string for metadata insertion
        const decoder = new TextDecoder('latin1');
        let pdfContent = decoder.decode(uint8Array);
        
        // Add metadata in PDF dictionary format
        const metadataStr = JSON.stringify(metadata);
        const encoded = btoa(metadataStr);
        
        // Insert XPIITAG metadata as custom PDF dictionary entry
        const xmpMetadata = `\n/XPIITAG <${encoded}>\n`;
        
        // Find a good insertion point (after Info dictionary)
        const infoMatch = pdfContent.match(/\/Info \d+ \d+ R/);
        if (infoMatch) {
            const insertPos = infoMatch.index + infoMatch[0].length;
            pdfContent = pdfContent.slice(0, insertPos) + xmpMetadata + pdfContent.slice(insertPos);
        } else {
            // Append at the end before %%EOF
            pdfContent = pdfContent.replace('%%EOF', xmpMetadata + '%%EOF');
        }
        
        // Convert back to ArrayBuffer
        const encoder = new TextEncoder();
        
        return {
            content: encoder.encode(pdfContent).buffer,
            type: 'pdf',
            extension: '.pdf'
        };
    }
    
    /**
     * Extract from PDF (basic)
     * @param {ArrayBuffer} buffer - PDF buffer
     * @returns {object|null} - Extracted metadata
     */
    function extractPDF(buffer) {
        try {
            const decoder = new TextDecoder('latin1');
            const pdfContent = decoder.decode(buffer);
            
            // Look for XPIITAG metadata
            const match = pdfContent.match(/\/XPIITAG <([A-Za-z0-9+/=]+)>/);
            if (match) {
                return JSON.parse(atob(match[1]));
            }
        } catch (e) {
            console.error('Failed to extract PDF metadata:', e);
        }
        
        return null;
    }
    
    /**
     * Detect if content has watermark
     * @param {string} content - Document content
     * @param {string} extension - File extension
     * @returns {boolean} - True if watermark detected
     */
    function hasWatermark(content, extension) {
        const type = getType(extension);
        
        switch (type) {
            case 'markdown':
                return content.includes('<!-- XPIITAG:');
            case 'json':
                return content.includes('"_xpiitag"');
            case 'text':
                return TextEmbedder.hasWatermark(content);
            case 'pdf':
                return content.includes('/XPIITAG');
            default:
                return false;
        }
    }
    
    /**
     * Get content type info
     * @param {string} extension - File extension
     * @returns {object} - Type info
     */
    function getTypeInfo(extension) {
        const type = getType(extension);
        return TYPES[type] || { type: 'text', extensions: [] };
    }
    
    /**
     * Clean document (remove watermark)
     * @param {string} content - Document content
     * @param {string} extension - File extension
     * @returns {string} - Clean content
     */
    function clean(content, extension) {
        const type = getType(extension);
        
        switch (type) {
            case 'markdown':
                return content.replace(/<!--\s*XPIITAG:[A-Za-z0-9+/=]+\s*-->/g, '').trim();
            case 'json':
                try {
                    const obj = JSON.parse(content);
                    delete obj._xpiitag;
                    return JSON.stringify(obj, null, 2);
                } catch {
                    return content;
                }
            case 'text':
                return TextEmbedder.remove(content);
            default:
                return content;
        }
    }
    
    // Public API
    return {
        process,
        extract,
        hasWatermark,
        getType,
        getTypeInfo,
        clean,
        TYPES
    };
})();

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentProcessor;
}
