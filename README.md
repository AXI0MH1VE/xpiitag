# XPIITAG - AI Content Attribution & Watermarking System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.0-blue.svg)](https://electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

> A lightweight, hardware-agnostic desktop application for verifying and attributing AI-generated content through invisible watermarking.

## 🎯 What is XPIITAG?

XPIITAG is a **"stapler" tool** for AI-generated content. It embeds authorship metadata directly into documents and images using **color-based steganography (LSB - Least Significant Bit)**. Think of it as a post-processing step that "staples" verification information onto any AI-generated content.

**Key Features:**
- ✅ **No ML Models Required** - Pure algorithmic processing
- ✅ **Hardware Agnostic** - Runs on standard hardware with minimal overhead
- ✅ **Invisible Watermarking** - LSB steganography maintains visual quality
- ✅ **Cryptographic Verification** - SHA-256 fingerprints and signature validation
- ✅ **Universal Compatibility** - Works with any AI model's output
- ✅ **Zero Egress** - All processing happens locally

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/AXI0MH1VE/xpiitag.git
cd xpiitag

# Install dependencies
npm install

# Run the application
npm start
```

### Development Mode
```bash
npm run dev
```

### Build for Production
```bash
# Windows
npm run build

# All platforms
npm run build:all
```

## 📖 How It Works

### 1. JSON Configuration
Create a JSON config with authorship metadata:

```json
{
  "model": "Gemini Pro",
  "provider": "Google",
  "timestamp": "2026-01-21T14:30:00Z",
  "signature": "base64_encoded_signature",
  "fingerprint": "sha256_hash",
  "version": "1.0.0"
}
```

### 2. Content Processing
- **Embed**: Load an image or document, paste the JSON config, and embed the metadata
- **Verify**: Upload watermarked content to extract and verify the embedded metadata
- **Export**: Download the watermarked file with invisible attribution

### 3. Steganography Engine
The system uses **LSB (Least Significant Bit)** steganography:
- Embeds metadata into the least significant bits of RGB pixel values
- Changes are visually imperceptible
- Survives basic image transformations
- Extractable without the original image

## 🏗️ Architecture

```
XPIITAG/
├── main.js                 # Electron main process
├── preload.js              # Secure bridge between main and renderer
├── index.html              # Main UI
├── css/
│   └── styles.css           # Dark theme styling
├── js/
│   ├── app.js              # Main application logic
│   ├── json-parser.js      # JSON validation & parsing
│   ├── verifier.js         # Cryptographic verification
│   ├── steganography.js    # LSB watermarking engine
│   ├── text-embedder.js    # Text document processing
│   ├── document-processor.js # Multi-format document handler
│   └── media-handler.js    # Audio/video processing
├── config/
│   └── providers.json       # Known AI provider public keys
└── package.json
```

## 🎨 UI/UX Design

**Dark Theme Color Palette:**
- Primary: `#0D1117` (deep dark)
- Secondary: `#161B22` (card background)
- Accent: `#58A6FF` (electric blue)
- Success: `#3FB950` (green)
- Warning: `#D29922` (amber)
- Error: `#F85149` (red)

**Typography:**
- Headings: JetBrains Mono
- Body: IBM Plex Sans
- Code: Fira Code

## 🔒 Security Features

- **SHA-256 Fingerprinting**: Unique content hashes
- **Digital Signatures**: Verify authenticity with public keys
- **Timestamp Verification**: Ensure content freshness
- **Provider Validation**: Match against known AI providers

## 📋 Supported Formats

| Format | Embed | Verify | Notes |
|--------|-------|--------|-------|
| PNG | ✅ | ✅ | Full color support |
| JPG/JPEG | ✅ | ✅ | Lossy compression aware |
| WebP | ✅ | ✅ | Modern format support |
| Text | ✅ | ✅ | UTF-8 encoding |
| JSON | ✅ | ✅ | Structured data |
| Markdown | ✅ | ✅ | Document format |

## 🛠️ Technical Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Desktop Framework**: Electron 28.0
- **Image Processing**: HTML5 Canvas API
- **Cryptography**: Web Crypto API
- **Build Tool**: electron-builder

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- LSB Steganography techniques
- Web Crypto API standards
- Electron community
- AI attribution research community

## 📞 Contact

**Project Link:** [https://github.com/AXI0MH1VE/xpiitag](https://github.com/AXI0MH1VE/xpiitag)

---

<p align="center">Made with ❤️ for the AI attribution community</p>
