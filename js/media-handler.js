/**
 * XPIITAG - Media Handler Module
 * Handles audio/video metadata embedding and extraction
 */

const MediaHandler = (function() {
    // Media types
    const TYPES = {
        audio: {
            extensions: ['.mp3', '.wav', '.ogg', '.flac', '.m4a'],
            mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4']
        },
        video: {
            extensions: ['.mp4', '.webm', '.mov', '.avi'],
            mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
        }
    };
    
    // XPIITAG metadata marker
    const MARKER = 'XPIITAG';
    
    /**
     * Get media type from extension
     * @param {string} extension - File extension
     * @returns {string} - 'audio', 'video', or null
     */
    function getMediaType(extension) {
        const ext = extension.toLowerCase().startsWith('.') ? extension : '.' + extension;
        
        for (const [type, config] of Object.entries(TYPES)) {
            if (config.extensions.includes(ext)) {
                return type;
            }
        }
        
        return null;
    }
    
    /**
     * Embed metadata into media file
     * For audio/video, we use a simple approach:
     * 1. For MP3: ID3 tags
     * 2. For MP4: Custom metadata box
     * 3. For others: Create sidecar JSON
     * @param {ArrayBuffer} buffer - Media file buffer
     * @param {string} extension - File extension
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Result with embedded media
     */
    async function embed(buffer, extension, metadata) {
        const mediaType = getMediaType(extension);
        const ext = extension.toLowerCase();
        
        if (!mediaType) {
            throw new Error('Unsupported media type');
        }
        
        let result;
        
        if (ext === '.mp3') {
            result = await embedMP3(buffer, metadata);
        } else if (ext === '.mp4' || ext === '.m4a') {
            result = await embedMP4(buffer, metadata);
        } else if (ext === '.wav') {
            result = await embedWAV(buffer, metadata);
        } else {
            // For unsupported formats, create sidecar file
            result = createSidecar(buffer, metadata);
        }
        
        return result;
    }
    
    /**
     * Extract metadata from media file
     * @param {ArrayBuffer} buffer - Media file buffer
     * @param {string} extension - File extension
     * @returns {object|null} - Extracted metadata
     */
    async function extract(buffer, extension) {
        const ext = extension.toLowerCase();
        
        if (ext === '.mp3') {
            return extractMP3(buffer);
        } else if (ext === '.mp4' || ext === '.m4a') {
            return extractMP4(buffer);
        } else if (ext === '.wav') {
            return extractWAV(buffer);
        }
        
        return null;
    }
    
    /**
     * Embed metadata into MP3 (using ID3v2)
     * @param {ArrayBuffer} buffer - MP3 buffer
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Result
     */
    async function embedMP3(buffer, metadata) {
        const uint8Array = new Uint8Array(buffer);
        
        // Check for ID3v2 header
        let offset = 0;
        if (uint8Array[0] === 0x49 && uint8Array[1] === 0x44 && uint8Array[2] === 0x33) {
            // ID3v2 found, skip to end of header
            const size = ((uint8Array[6] & 0x7F) << 21) | 
                        ((uint8Array[7] & 0x7F) << 14) | 
                        ((uint8Array[8] & 0x7F) << 7) | 
                        (uint8Array[9] & 0x7F);
            offset = 10 + size;
        }
        
        // Encode metadata as JSON
        const metadataStr = JSON.stringify(metadata);
        const encoded = btoa(unescape(encodeURIComponent(metadataStr)));
        
        // Create custom ID3 frame (COMM comment with XPIITAG)
        const frameData = createID3Frame('COMM', 'XPIITAG', encoded);
        
        // Insert frame at ID3 end
        const newBuffer = new Uint8Array(buffer.byteLength + frameData.length);
        newBuffer.set(uint8Array.slice(0, offset), 0);
        newBuffer.set(frameData, offset);
        newBuffer.set(uint8Array.slice(offset), offset + frameData.length);
        
        return {
            buffer: newBuffer.buffer,
            type: 'audio',
            extension: '.mp3',
            hasSidecar: false
        };
    }
    
    /**
     * Extract from MP3
     * @param {ArrayBuffer} buffer - MP3 buffer
     * @returns {object|null} - Extracted metadata
     */
    function extractMP3(buffer) {
        const uint8Array = new Uint8Array(buffer);
        
        // Check for ID3v2 header
        let offset = 0;
        if (uint8Array[0] === 0x49 && uint8Array[1] === 0x44 && uint8Array[2] === 0x33) {
            const size = ((uint8Array[6] & 0x7F) << 21) | 
                        ((uint8Array[7] & 0x7F) << 14) | 
                        ((uint8Array[8] & 0x7F) << 7) | 
                        (uint8Array[9] & 0x7F);
            offset = 10 + size;
        }
        
        // Search for COMM frame with XPIITAG
        while (offset < uint8Array.length - 10) {
            if (uint8Array[offset] === 0x43 && 
                uint8Array[offset + 1] === 0x4F && 
                uint8Array[offset + 2] === 0x4D && 
                uint8Array[offset + 3] === 0x4D) {
                // Found COMM frame
                const frameSize = (uint8Array[offset + 4] << 24) | 
                                 (uint8Array[offset + 5] << 16) | 
                                 (uint8Array[offset + 6] << 8) | 
                                 uint8Array[offset + 7];
                
                // Skip to frame data (after flags and encoding)
                const frameDataOffset = offset + 10;
                const encoding = uint8Array[frameDataOffset];
                
                // Read description (null-terminated)
                let descEnd = frameDataOffset + 1;
                while (descEnd < offset + frameSize && uint8Array[descEnd] !== 0) {
                    descEnd++;
                }
                
                // Check if description is XPIITAG
                const description = new TextDecoder().decode(uint8Array.slice(frameDataOffset + 1, descEnd));
                if (description === 'XPIITAG') {
                    // Extract encoded data
                    const dataStart = descEnd + 1;
                    const dataEnd = offset + frameSize;
                    const encoded = new TextDecoder().decode(uint8Array.slice(dataStart, dataEnd));
                    
                    try {
                        return JSON.parse(decodeURIComponent(escape(atob(encoded))));
                    } catch {}
                }
                
                offset += frameSize;
            }
            offset++;
        }
        
        return null;
    }
    
    /**
     * Create ID3 frame
     * @param {string} frameId - Frame ID (e.g., 'COMM')
     * @param {string} description - Frame description
     * @param {string} data - Frame data
     * @returns {Uint8Array} - Frame data
     */
    function createID3Frame(frameId, description, data) {
        const descBytes = new TextEncoder().encode(description + '\0');
        const dataBytes = new TextEncoder().encode(data);
        
        // Frame = ID (4) + size (4) + flags (2) + data
        const frame = new Uint8Array(10 + 1 + descBytes.length + dataBytes.length);
        
        // Frame ID
        frame[0] = frameId.charCodeAt(0);
        frame[1] = frameId.charCodeAt(1);
        frame[2] = frameId.charCodeAt(2);
        frame[3] = frameId.charCodeAt(3);
        
        // Size (big endian)
        const size = 1 + descBytes.length + dataBytes.length;
        frame[4] = (size >> 24) & 0xFF;
        frame[5] = (size >> 16) & 0xFF;
        frame[6] = (size >> 8) & 0xFF;
        frame[7] = size & 0xFF;
        
        // Flags (none)
        frame[8] = 0;
        frame[9] = 0;
        
        // Encoding (UTF-8)
        frame[10] = 0x03; // UTF-8
        
        // Description
        frame.set(descBytes, 11);
        
        // Data
        frame.set(dataBytes, 11 + descBytes.length);
        
        return frame;
    }
    
    /**
     * Embed metadata into MP4/M4A
     * @param {ArrayBuffer} buffer - MP4 buffer
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Result
     */
    async function embedMP4(buffer, metadata) {
        // For simplicity, we'll add as a custom box
        // In production, you'd use a library like mp4box.js
        const metadataStr = JSON.stringify(metadata);
        const encoded = btoa(unescape(encodeURIComponent(metadataStr)));
        
        // Create custom 'XTAG' box
        const boxData = createMP4Box('XTAG', encoded);
        
        // Append box to end
        const uint8Array = new Uint8Array(buffer);
        const newBuffer = new Uint8Array(buffer.byteLength + boxData.length);
        newBuffer.set(uint8Array, 0);
        newBuffer.set(boxData, uint8Array.length);
        
        return {
            buffer: newBuffer.buffer,
            type: 'video',
            extension: '.mp4',
            hasSidecar: false
        };
    }
    
    /**
     * Extract from MP4
     * @param {ArrayBuffer} buffer - MP4 buffer
     * @returns {object|null} - Extracted metadata
     */
    function extractMP4(buffer) {
        // Simplified extraction - search for XTAG box
        const uint8Array = new Uint8Array(buffer);
        
        // Search for 'XTAG' box (type at offset + 4)
        for (let i = 0; i < uint8Array.length - 8; i++) {
            if (uint8Array[i + 4] === 0x58 && // X
                uint8Array[i + 5] === 0x54 && // T
                uint8Array[i + 6] === 0x41 && // A
                uint8Array[i + 7] === 0x47) {  // G
                
                // Found XTAG box
                const size = (uint8Array[i] << 24) | 
                           (uint8Array[i + 1] << 16) | 
                           (uint8Array[i + 2] << 8) | 
                           uint8Array[i + 3];
                
                const data = new TextDecoder().decode(uint8Array.slice(i + 8, i + size));
                try {
                    return JSON.parse(decodeURIComponent(escape(atob(data))));
                } catch {}
            }
        }
        
        return null;
    }
    
    /**
     * Create MP4 box
     * @param {string} type - Box type
     * @param {string} data - Box data
     * @returns {Uint8Array} - Box data
     */
    function createMP4Box(type, data) {
        const dataBytes = new TextEncoder().encode(data);
        const box = new Uint8Array(8 + dataBytes.length);
        
        // Size
        const size = dataBytes.length + 8;
        box[0] = (size >> 24) & 0xFF;
        box[1] = (size >> 16) & 0xFF;
        box[2] = (size >> 8) & 0xFF;
        box[3] = size & 0xFF;
        
        // Type
        box[4] = type.charCodeAt(0);
        box[5] = type.charCodeAt(1);
        box[6] = type.charCodeAt(2);
        box[7] = type.charCodeAt(3);
        
        // Data
        box.set(dataBytes, 8);
        
        return box;
    }
    
    /**
     * Embed metadata into WAV
     * @param {ArrayBuffer} buffer - WAV buffer
     * @param {object} metadata - Metadata to embed
     * @returns {object} - Result
     */
    async function embedWAV(buffer, metadata) {
        const uint8Array = new Uint8Array(buffer);
        
        // Check RIFF header
        if (!(uint8Array[0] === 0x52 && // R
              uint8Array[1] === 0x49 && // I
              uint8Array[2] === 0x46 && // F
              uint8Array[3] === 0x46)) { // F
            throw new Error('Invalid WAV file');
        }
        
        // Find data chunk and insert metadata before it
        let offset = 12;
        while (offset < uint8Array.length - 8) {
            const chunkId = String.fromCharCode(
                uint8Array[offset], 
                uint8Array[offset + 1], 
                uint8Array[offset + 2], 
                uint8Array[offset + 3]
            );
            
            const chunkSize = uint8Array[offset + 4] | 
                             (uint8Array[offset + 5] << 8) | 
                             (uint8Array[offset + 6] << 16) | 
                             (uint8Array[offset + 7] << 24);
            
            if (chunkId === 'data') {
                // Insert XPIITAG LIST chunk before data
                const metadataStr = JSON.stringify(metadata);
                const encoded = btoa(unescape(encodeURIComponent(metadataStr)));
                const listChunk = createWAVListChunk('XPIITAG', encoded);
                
                const newBuffer = new Uint8Array(buffer.byteLength + listChunk.length);
                newBuffer.set(uint8Array.slice(0, offset), 0);
                newBuffer.set(listChunk, offset);
                newBuffer.set(uint8Array.slice(offset), offset + listChunk.length);
                
                // Update file size
                const fileSize = newBuffer.length - 8;
                newBuffer[4] = fileSize & 0xFF;
                newBuffer[5] = (fileSize >> 8) & 0xFF;
                newBuffer[6] = (fileSize >> 16) & 0xFF;
                newBuffer[7] = (fileSize >> 24) & 0xFF;
                
                return {
                    buffer: newBuffer.buffer,
                    type: 'audio',
                    extension: '.wav',
                    hasSidecar: false
                };
            }
            
            offset += 8 + chunkSize;
            if (chunkSize % 2 !== 0) offset++; // Padding
        }
        
        throw new Error('Could not find data chunk in WAV');
    }
    
    /**
     * Extract from WAV
     * @param {ArrayBuffer} buffer - WAV buffer
     * @returns {object|null} - Extracted metadata
     */
    function extractWAV(buffer) {
        const uint8Array = new Uint8Array(buffer);
        
        // Search for XPIITAG LIST chunk
        let offset = 12;
        while (offset < uint8Array.length - 12) {
            const chunkId = String.fromCharCode(
                uint8Array[offset], 
                uint8Array[offset + 1], 
                uint8Array[offset + 2], 
                uint8Array[offset + 3]
            );
            
            if (chunkId === 'LIST') {
                const listType = String.fromCharCode(
                    uint8Array[offset + 4],
                    uint8Array[offset + 5],
                    uint8Array[offset + 6],
                    uint8Array[offset + 7]
                );
                
                if (listType === 'XPIITAG') {
                    const dataOffset = offset + 8;
                    const dataSize = (uint8Array[offset + 4 - 4] | 
                                     (uint8Array[offset + 4 - 3] << 8) | 
                                     (uint8Array[offset + 4 - 2] << 16) | 
                                     (uint8Array[offset + 4 - 1] << 24)) - 4;
                    
                    const encoded = new TextDecoder().decode(
                        uint8Array.slice(dataOffset, dataOffset + dataSize)
                    );
                    
                    try {
                        return JSON.parse(decodeURIComponent(escape(atob(encoded))));
                    } catch {}
                }
            }
            
            const chunkSize = uint8Array[offset + 4] | 
                             (uint8Array[offset + 5] << 8) | 
                             (uint8Array[offset + 6] << 16) | 
                             (uint8Array[offset + 7] << 24);
            
            offset += 8 + chunkSize;
            if (chunkSize % 2 !== 0) offset++;
        }
        
        return null;
    }
    
    /**
     * Create WAV LIST chunk
     * @param {string} type - List type
     * @param {string} data - Data
     * @returns {Uint8Array} - Chunk data
     */
    function createWAVListChunk(type, data) {
        const dataBytes = new TextEncoder().encode(data);
        const chunk = new Uint8Array(8 + 4 + dataBytes.length);
        
        // 'LIST'
        chunk[0] = 0x4C; // L
        chunk[1] = 0x49; // I
        chunk[2] = 0x53; // S
        chunk[3] = 0x54; // T
        
        // Size
        const size = 4 + dataBytes.length;
        chunk[4] = size & 0xFF;
        chunk[5] = (size >> 8) & 0xFF;
        chunk[6] = (size >> 16) & 0xFF;
        chunk[7] = (size >> 24) & 0xFF;
        
        // Type
        chunk[8] = type.charCodeAt(0);
        chunk[9] = type.charCodeAt(1);
        chunk[10] = type.charCodeAt(2);
        chunk[11] = type.charCodeAt(3);
        
        // Data
        chunk.set(dataBytes, 12);
        
        return chunk;
    }
    
    /**
     * Create sidecar file for unsupported formats
     * @param {ArrayBuffer} buffer - Original buffer
     * @param {object} metadata - Metadata
     * @returns {object} - Result with sidecar info
     */
    function createSidecar(buffer, metadata) {
        const metadataStr = JSON.stringify(metadata, null, 2);
        
        return {
            buffer: buffer,
            type: 'media',
            extension: null,
            hasSidecar: true,
            sidecarContent: metadataStr,
            sidecarFilename: 'metadata.json'
        };
    }
    
    /**
     * Check if media has watermark
     * @param {ArrayBuffer} buffer - Media buffer
     * @param {string} extension - File extension
     * @returns {Promise<boolean>} - True if watermark detected
     */
    async function hasWatermark(buffer, extension) {
        const extracted = await extract(buffer, extension);
        return extracted !== null;
    }
    
    // Public API
    return {
        embed,
        extract,
        hasWatermark,
        getMediaType,
        TYPES
    };
})();

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaHandler;
}
