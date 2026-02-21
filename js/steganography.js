/**
 * XPIITAG - Steganography Module
 * LSB (Least Significant Bit) watermarking for images
 */

const Steganography = (function() {
    // Magic header to identify watermarked images
    const MAGIC_HEADER = 'XPIITAG';
    const HEADER_BYTES = [0x58, 0x50, 0x49, 0x49, 0x54, 0x41, 0x47]; // "XPIITAG"
    
    // Metadata encoding
    const VERSION = 1;
    
    /**
     * Embed metadata into image using LSB steganography
     * @param {ImageData} imageData - Canvas ImageData
     * @param {object} metadata - Metadata to embed
     * @returns {ImageData} - Modified ImageData with embedded metadata
     */
    function embed(imageData, metadata) {
        // Serialize metadata to JSON
        const metadataStr = JSON.stringify(metadata);
        
        // Convert to binary
        const binaryData = stringToBinary(metadataStr);
        
        // Check capacity
        const capacity = calculateCapacity(imageData);
        const required = binaryData.length + (HEADER_BYTES.length * 8) + 16; // header + length prefix
        
        if (required > capacity) {
            throw new Error(`Insufficient image capacity. Need ${required} bits, have ${capacity} bits.`);
        }
        
        // Create a copy to modify
        const result = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        
        let bitIndex = 0;
        const data = result.data;
        
        // Embed header
        for (let i = 0; i < HEADER_BYTES.length; i++) {
            for (let j = 0; j < 8; j++) {
                const bit = (HEADER_BYTES[i] >> j) & 1;
                const pixelIndex = bitIndex * 4;
                // Modify the least significant bit of the blue channel
                data[pixelIndex + 2] = (data[pixelIndex + 2] & 0xFE) | bit;
                bitIndex++;
            }
        }
        
        // Embed data length (32-bit)
        const length = binaryData.length;
        for (let j = 0; j < 32; j++) {
            const bit = (length >> j) & 1;
            const pixelIndex = bitIndex * 4;
            data[pixelIndex + 2] = (data[pixelIndex + 2] & 0xFE) | bit;
            bitIndex++;
        }
        
        // Embed data
        for (let i = 0; i < binaryData.length; i++) {
            const bit = parseInt(binaryData[i], 2);
            const pixelIndex = bitIndex * 4;
            data[pixelIndex + 2] = (data[pixelIndex + 2] & 0xFE) | bit;
            bitIndex++;
        }
        
        return result;
    }
    
    /**
     * Extract metadata from watermarked image
     * @param {ImageData} imageData - Canvas ImageData
     * @returns {object|null} - Extracted metadata or null if not found
     */
    function extract(imageData) {
        const data = imageData.data;
        let bitIndex = 0;
        
        // Read and verify header
        let header = [];
        for (let i = 0; i < HEADER_BYTES.length; i++) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
                const pixelIndex = bitIndex * 4;
                const bit = data[pixelIndex + 2] & 1;
                byte = (byte << 1) | bit;
                bitIndex++;
            }
            header.push(byte);
        }
        
        // Check magic header
        if (!verifyHeader(header)) {
            return null;
        }
        
        // Read data length
        let length = 0;
        for (let j = 0; j < 32; j++) {
            const pixelIndex = bitIndex * 4;
            const bit = data[pixelIndex + 2] & 1;
            length = (length << 1) | bit;
            bitIndex++;
        }
        
        // Sanity check for length
        const capacity = calculateCapacity(imageData);
        if (length < 0 || length > capacity || length > 1000000) {
            console.warn('Invalid data length detected');
            return null;
        }
        
        // Read data
        let binaryData = '';
        for (let i = 0; i < length; i++) {
            const pixelIndex = bitIndex * 4;
            const bit = data[pixelIndex + 2] & 1;
            binaryData += bit;
            bitIndex++;
        }
        
        // Convert binary to string
        const metadataStr = binaryToString(binaryData);
        
        try {
            return JSON.parse(metadataStr);
        } catch (e) {
            console.error('Failed to parse metadata:', e);
            return null;
        }
    }
    
    /**
     * Verify header bytes
     * @param {array} header - Extracted header bytes
     * @returns {boolean} - True if valid
     */
    function verifyHeader(header) {
        if (header.length !== HEADER_BYTES.length) return false;
        for (let i = 0; i < header.length; i++) {
            if (header[i] !== HEADER_BYTES[i]) return false;
        }
        return true;
    }
    
    /**
     * Calculate image capacity in bits
     * @param {ImageData} imageData - Canvas ImageData
     * @returns {number} - Available bits
     */
    function calculateCapacity(imageData) {
        // Using only the blue channel of each pixel
        return Math.floor(imageData.data.length / 4);
    }
    
    /**
     * Convert string to binary
     * @param {string} str - Input string
     * @returns {string} - Binary string
     */
    function stringToBinary(str) {
        let binary = '';
        for (let i = 0; i < str.length; i++) {
            binary += str.charCodeAt(i).toString(2).padStart(8, '0');
        }
        return binary;
    }
    
    /**
     * Convert binary to string
     * @param {string} binary - Binary string
     * @returns {string} - Decoded string
     */
    function binaryToString(binary) {
        let str = '';
        for (let i = 0; i < binary.length; i += 8) {
            const byte = binary.substr(i, 8);
            str += String.fromCharCode(parseInt(byte, 2));
        }
        return str;
    }
    
    /**
     * Check if image has watermark
     * @param {ImageData} imageData - Canvas ImageData
     * @returns {boolean} - True if watermark detected
     */
    function hasWatermark(imageData) {
        const extracted = extract(imageData);
        return extracted !== null;
    }
    
    /**
     * Create Canvas ImageData from image file
     * @param {File|Blob} file - Image file
     * @returns {Promise<ImageData>} - Canvas ImageData
     */
    async function createImageData(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(imageData);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };
            
            img.src = url;
        });
    }
    
    /**
     * Create Canvas ImageData from base64 data
     * @param {string} base64 - Base64 encoded image
     * @returns {Promise<ImageData>} - Canvas ImageData
     */
    async function createImageDataFromBase64(base64) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                resolve(imageData);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image from base64'));
            };
            
            img.src = 'data:image/png;base64,' + base64;
        });
    }
    
    /**
     * Convert ImageData to base64
     * @param {ImageData} imageData - Canvas ImageData
     * @returns {string} - Base64 encoded PNG
     */
    function imageDataToBase64(imageData) {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        
        return canvas.toDataURL('image/png').split(',')[1];
    }
    
    /**
     * Embed metadata into image file
     * @param {File|Blob} imageFile - Image file
     * @param {object} metadata - Metadata to embed
     * @returns {Promise<string>} - Base64 encoded watermarked image
     */
    async function embedInFile(imageFile, metadata) {
        const imageData = await createImageData(imageFile);
        const watermarked = embed(imageData, metadata);
        return imageDataToBase64(watermarked);
    }
    
    /**
     * Extract metadata from image file
     * @param {File|Blob} imageFile - Image file
     * @returns {Promise<object|null>} - Extracted metadata or null
     */
    async function extractFromFile(imageFile) {
        const imageData = await createImageData(imageFile);
        return extract(imageData);
    }
    
    /**
     * Embed metadata in image from base64
     * @param {string} base64 - Base64 encoded image
     * @param {object} metadata - Metadata to embed
     * @returns {Promise<string>} - Base64 encoded watermarked image
     */
    async function embedInBase64(base64, metadata) {
        const imageData = await createImageDataFromBase64(base64);
        const watermarked = embed(imageData, metadata);
        return imageDataToBase64(watermarked);
    }
    
    /**
     * Extract metadata from base64 image
     * @param {string} base64 - Base64 encoded image
     * @returns {Promise<object|null>} - Extracted metadata or null
     */
    async function extractFromBase64(base64) {
        const imageData = await createImageDataFromBase64(base64);
        return extract(imageData);
    }
    
    // Public API
    return {
        embed,
        extract,
        hasWatermark,
        createImageData,
        createImageDataFromBase64,
        imageDataToBase64,
        embedInFile,
        extractFromFile,
        embedInBase64,
        extractFromBase64,
        MAGIC_HEADER,
        VERSION
    };
})();

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Steganography;
}
