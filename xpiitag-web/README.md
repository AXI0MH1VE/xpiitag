# XPIITAG - AI Content Attribution & Watermarking System

A lightweight, hardware-agnostic web application for verifying and attributing AI-generated content through invisible watermarking and cryptographic verification.

## 🎯 Overview

XPIITAG acts as a "digital stapler" - embedding AI authorship metadata into content using advanced steganography techniques. No ML models required - pure algorithmic processing that runs entirely in the browser.

### Key Features

- **Image Steganography**: LSB (Least Significant Bit) encoding for invisible metadata embedding in images
- **Text Watermarking**: Zero-width character encoding for invisible text metadata
- **Cryptographic Verification**: SHA-256 fingerprinting and signature validation
- **Multi-Provider Support**: OpenAI, Google, Anthropic, xAI, Meta, Mistral, Cohere, Stability AI
- **Hardware Agnostic**: Runs on any device with a modern browser
- **Zero Egress**: All processing happens client-side

## 🏗️ Architecture

```
xpiitag-web/
├── src/
│   ├── lib/
│   │   ├── steganography.ts    # LSB image encoding
│   │   ├── text-embedder.ts    # Zero-width text encoding
│   │   └── verifier.ts         # Cryptographic validation
│   ├── config/
│   │   └── providers.json      # AI provider database
│   ├── App.tsx                 # Main UI component
│   ├── main.tsx                # React entry point
│   └── index.css               # Tailwind styles
├── server.ts                   # Express backend
├── index.html                  # HTML entry point
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/xpiitag-web.git
cd xpiitag-web

# Install dependencies
npm install

# Start development server
npm run dev

# Start backend server (optional)
npm run server
```

### Build for Production

```bash
npm run build
```

## 📖 Usage

### Tagging Content

1. Select **Tag Content** tab
2. Choose content type (Image or Text)
3. Upload file or paste text
4. Click **Tag Content**
5. Download watermarked file

### Verifying Content

1. Select **Verify** tab
2. Upload watermarked file or paste text
3. (Optional) Paste JSON metadata
4. Click **Verify Content**
5. View verification results

## 🔧 Technical Details

### Image Steganography (LSB)

Embeds metadata into the least significant bits of RGB channels:
- 3 bits per pixel (R, G, B)
- 32-bit length header
- JSON payload encoding
- Lossless PNG output

### Text Watermarking

Uses zero-width Unicode characters:
- `\u200B` (Zero Width Space) = 0
- `\u200C` (Zero Width Non-Joiner) = 1
- `\u200D` (Zero Width Joiner) = delimiter

### JSON Schema

```json
{
  "version": "1.0",
  "provider": "OpenAI",
  "model": "GPT-4",
  "timestamp": "2024-01-01T00:00:00Z",
  "fingerprint": "sha256_hash",
  "contentHash": "sha256_hash",
  "signature": "cryptographic_signature"
}
```

## 🎨 UI Design

- **Dark Theme**: Matte blacks (#0a0a0a, #141414)
- **Neon Accents**: Electric blue (#00d4ff), Green (#00ff88), Purple (#a855f7)
- **Typography**: JetBrains Mono (code), Inter (UI)
- **Animations**: Motion library for smooth transitions

## 🔒 Security

- Client-side processing only
- SHA-256 cryptographic hashing
- HMAC signature generation
- No data leaves the browser

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Animations**: Motion
- **Icons**: Lucide React
- **Backend**: Express.js (optional)
- **Crypto**: crypto-js

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

## 📞 Support

For issues and feature requests, please use GitHub Issues.

---

**XPIITAG** - Trust through Transparency 🔐
