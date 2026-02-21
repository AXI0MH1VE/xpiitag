/**
 * Text Metadata Encoding Module
 * Embeds invisible metadata into plain text using Zero-Width Characters
 */

export interface TextEmbedResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata: {
    originalLength: number;
    embeddedLength: number;
  };
}

export class TextEmbedder {
  // Zero-width characters for binary encoding
  private static readonly ZERO_WIDTH = {
    '0': '\u200B', // Zero Width Space
    '1': '\u200C', // Zero Width Non-Joiner
    'delimiter': '\u200D', // Zero Width Joiner
  };
  
  /**
   * Embeds JSON metadata into text using zero-width characters
   */
  static embed(
    text: string, 
    metadata: Record<string, unknown>
  ): TextEmbedResult {
    try {
      const jsonString = JSON.stringify(metadata);
      const binaryString = this.textToBinary(jsonString);
      
      // Convert binary to zero-width characters
      let encoded = '';
      for (const bit of binaryString) {
        encoded += this.ZERO_WIDTH[bit as '0' | '1'];
      }
      
      // Add delimiter and encoded data at the end of text
      const embeddedText = text + this.ZERO_WIDTH.delimiter + encoded;
      
      return {
        success: true,
        text: embeddedText,
        metadata: {
          originalLength: text.length,
          embeddedLength: jsonString.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to embed metadata',
        metadata: {
          originalLength: text.length,
          embeddedLength: 0
        }
      };
    }
  }
  
  /**
   * Extracts metadata from text containing zero-width characters
   */
  static extract(text: string): {
    success: boolean;
    text?: string;
    metadata?: Record<string, unknown>;
    error?: string;
  } {
    try {
      // Find delimiter position
      const delimiterIndex = text.indexOf(this.ZERO_WIDTH.delimiter);
      
      if (delimiterIndex === -1) {
        return {
          success: false,
          error: 'No embedded metadata found'
        };
      }
      
      // Extract original text (before delimiter)
      const originalText = text.substring(0, delimiterIndex);
      
      // Extract encoded data (after delimiter)
      const encodedData = text.substring(delimiterIndex + 1);
      
      // Convert zero-width characters back to binary
      let binaryString = '';
      for (const char of encodedData) {
        if (char === this.ZERO_WIDTH['0']) {
          binaryString += '0';
        } else if (char === this.ZERO_WIDTH['1']) {
          binaryString += '1';
        }
        // Ignore any other characters (shouldn't happen)
      }
      
      if (binaryString.length === 0) {
        return {
          success: false,
          error: 'No valid metadata found'
        };
      }
      
      // Convert binary to text
      const jsonString = this.binaryToText(binaryString);
      
      // Parse JSON
      const metadata = JSON.parse(jsonString);
      
      return {
        success: true,
        text: originalText,
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
   * Checks if text contains embedded metadata
   */
  static hasEmbeddedData(text: string): boolean {
    return text.includes(this.ZERO_WIDTH.delimiter);
  }
  
  /**
   * Strips all zero-width characters from text
   */
  static stripInvisibleChars(text: string): string {
    return text
      .replace(new RegExp(this.ZERO_WIDTH['0'], 'g'), '')
      .replace(new RegExp(this.ZERO_WIDTH['1'], 'g'), '')
      .replace(new RegExp(this.ZERO_WIDTH.delimiter, 'g'), '');
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
   * Gets statistics about embedded data
   */
  static getStats(text: string): {
    hasData: boolean;
    dataSize?: number;
    invisibleCharCount: number;
  } {
    const invisibleCharCount = (
      (text.match(new RegExp(this.ZERO_WIDTH['0'], 'g')) || []).length +
      (text.match(new RegExp(this.ZERO_WIDTH['1'], 'g')) || []).length +
      (text.match(new RegExp(this.ZERO_WIDTH.delimiter, 'g')) || []).length
    );
    
    const hasData = text.includes(this.ZERO_WIDTH.delimiter);
    
    let dataSize;
    if (hasData) {
      const delimiterIndex = text.indexOf(this.ZERO_WIDTH.delimiter);
      const encodedData = text.substring(delimiterIndex + 1);
      dataSize = Math.floor(encodedData.length / 8);
    }
    
    return {
      hasData,
      dataSize,
      invisibleCharCount
    };
  }
}
