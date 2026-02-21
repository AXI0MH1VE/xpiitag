/**
 * Image Steganography Module
 * Embeds metadata into images using LSB (Least Significant Bit) encoding
 */

export interface SteganographyResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
  metadata: {
    originalSize: number;
    embeddedSize: number;
    capacity: number;
  };
}

export class ImageSteganography {
  /**
   * Embeds JSON metadata into an image using LSB steganography
   */
  static async embed(
    imageFile: File, 
    metadata: Record<string, unknown>
  ): Promise<SteganographyResult> {
    try {
      const jsonString = JSON.stringify(metadata);
      const binaryData = this.textToBinary(jsonString);
      
      // Load image
      const imageBitmap = await createImageBitmap(imageFile);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      ctx.drawImage(imageBitmap, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate capacity (3 bits per pixel - R, G, B channels)
      const capacity = (data.length / 4) * 3;
      
      if (binaryData.length > capacity) {
        return {
          success: false,
          error: `Metadata too large. Max: ${Math.floor(capacity / 8)} bytes, Got: ${binaryData.length / 8} bytes`,
          metadata: {
            originalSize: jsonString.length,
            embeddedSize: 0,
            capacity: Math.floor(capacity / 8)
          }
        };
      }
      
      // Add length header (32 bits)
      const lengthBinary = (binaryData.length / 8).toString(2).padStart(32, '0');
      const fullBinary = lengthBinary + binaryData;
      
      // Embed data into LSB of RGB channels
      let bitIndex = 0;
      for (let i = 0; i < data.length && bitIndex < fullBinary.length; i += 4) {
        // Skip alpha channel (i + 3)
        for (let channel = 0; channel < 3 && bitIndex < fullBinary.length; channel++) {
          const byteIndex = i + channel;
          const bit = parseInt(fullBinary[bitIndex], 10);
          
          // Replace LSB with data bit
          data[byteIndex] = (data[byteIndex] & 0xFE) | bit;
          bitIndex++;
        }
      }
      
      // Put modified data back
      ctx.putImageData(imageData, 0, 0);
      
      // Export as PNG (lossless format required for LSB)
      const dataUrl = canvas.toDataURL('image/png');
      
      return {
        success: true,
        dataUrl,
        metadata: {
          originalSize: jsonString.length,
          embeddedSize: binaryData.length / 8,
          capacity: Math.floor(capacity / 8)
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          originalSize: 0,
          embeddedSize: 0,
          capacity: 0
        }
      };
    }
  }
  
  /**
   * Extracts metadata from a steganographic image
   */
  static async extract(imageFile: File): Promise<{
    success: boolean;
    metadata?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const imageBitmap = await createImageBitmap(imageFile);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      ctx.drawImage(imageBitmap, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Extract length header (32 bits)
      let lengthBinary = '';
      let bitIndex = 0;
      
      for (let i = 0; i < data.length && bitIndex < 32; i += 4) {
        for (let channel = 0; channel < 3 && bitIndex < 32; channel++) {
          const byteIndex = i + channel;
          const bit = data[byteIndex] & 1;
          lengthBinary += bit;
          bitIndex++;
        }
      }
      
      const dataLength = parseInt(lengthBinary, 2);
      
      // Validate length
      const maxCapacity = (data.length / 4) * 3;
      if (dataLength > maxCapacity / 8 || dataLength <= 0 || dataLength > 100000) {
        return {
          success: false,
          error: 'No valid metadata found or corrupted data'
        };
      }
      
      // Extract data bits
      let binaryData = '';
      const totalBits = 32 + (dataLength * 8);
      
      for (let i = 0; i < data.length && bitIndex < totalBits; i += 4) {
        for (let channel = 0; channel < 3 && bitIndex < totalBits; channel++) {
          if (bitIndex >= 32) { // Skip header bits
            const byteIndex = i + channel;
            const bit = data[byteIndex] & 1;
            binaryData += bit;
          }
          bitIndex++;
        }
      }
      
      // Convert binary to text
      const jsonString = this.binaryToText(binaryData);
      
      // Parse JSON
      const metadata = JSON.parse(jsonString);
      
      return {
        success: true,
        metadata
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract metadata'
      };
    }
  }
  
  /**
   * Converts text to binary string
   */
  private static textToBinary(text: string): string {
    return text.split('').map(char => {
      return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
  }
  
  /**
   * Converts binary string to text
   */
  private static binaryToText(binary: string): string {
    const bytes = binary.match(/.{8}/g) || [];
    return bytes.map(byte => {
      return String.fromCharCode(parseInt(byte, 2));
    }).join('');
  }
  
  /**
   * Calculates maximum capacity for an image
   */
  static calculateCapacity(width: number, height: number): number {
    // 3 bits per pixel (RGB), 8 bits per byte
    const totalBits = width * height * 3;
    // Subtract 4 bytes for length header
    return Math.floor((totalBits / 8) - 4);
  }
}
