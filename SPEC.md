# XPIITAG - AI Watermark Stapler

## Project Overview

**Project Name:** XPIITAG - AI Watermark Stapler  
**Type:** Electron Desktop Application  
**Core Functionality:** A lightweight, hardware-agnostic system that verifies AI-generated content through JSON configuration and embeds authorship attribution using color-based steganography and metadata encoding.
**Target Users:** Organizations and individuals who need to verify and attribute AI-generated content (text, images, documents, audio/video).

---

## UI/UX Specification

### Layout Structure

**Page Sections:**
1. **Header** - Logo, title, and navigation
2. **Hero Section** - Brief description of the system
3. **Main Workspace** - Split into two panels:
   - Left Panel: Input/Upload area
   - Right Panel: Verification results & output
4. **Footer** - Credits and info

**Responsive Breakpoints:**
- Mobile: < 768px (stacked layout)
- Tablet: 768px - 1024px (compact layout)
- Desktop: > 1024px (side-by-side panels)

### Visual Design

**Color Palette:**
- Primary: `#0D1117` (deep dark)
- Secondary: `#161B22` (card background)
- Accent: `#58A6FF` (electric blue)
- Success: `#3FB950` (green)
- Warning: `#D29922` (amber)
- Error: `#F85149` (red)
- Text Primary: `#E6EDF3`
- Text Secondary: `#8B949E`
- Border: `#30363D`

**Typography:**
- Headings: "JetBrains Mono", monospace
- Body: "IBM Plex Sans", sans-serif
- Code/JSON: "Fira Code", monospace

**Spacing System:**
- Base unit: 8px
- Margins: 16px, 24px, 32px
- Padding: 12px, 16px, 24px
- Border radius: 8px (cards), 4px (buttons)

**Visual Effects:**
- Subtle glow on accent elements
- Smooth transitions (0.2s ease)
- Card hover lift effect
- Gradient borders on focus

### Components

1. **JSON Config Editor** - Syntax-highlighted textarea for JSON input
2. **File Upload Zone** - Drag & drop area for images/documents
3. **Verification Panel** - Shows validation status, metadata breakdown
4. **Watermark Preview** - Before/after comparison
5. **Status Badges** - Valid, Invalid, Unknown states
6. **Action Buttons** - Verify, Embed, Download

---

## Functionality Specification

### Core Features

1. **JSON Configuration Parser**
   - Accept JSON with: model name, provider, timestamp, attribution signatures, cryptographic fingerprints
   - Validate JSON schema
   - Display parsed data in readable format

2. **Content Verification**
   - Verify cryptographic signatures against known standards
   - Match fingerprints against public keys database
   - Display verification status (Valid/Invalid/Unknown)

3. **Metadata Embedding (Steganography)**
   - Color-based encoding for images (LSB - Least Significant Bit)
   - Metadata injection into image pixels
   - Invisible watermarking that survives basic transformations

4. **Supported Formats**
   - Images: PNG, JPG, JPEG, WebP
   - Text: Plain text, JSON, Markdown

5. **Non-Model Approach**
   - Pure algorithmic processing
   - No ML models required
   - Hardware-agnostic (runs in browser/node.js)

### User Interactions

1. User pastes JSON config or loads from file
2. User uploads image/document to verify or embed
3. System parses JSON and validates
4. System displays verification results
5. User can embed metadata into new content
6. User downloads watermarked output

### Edge Cases

- Invalid JSON format
- Unsupported file types
- Corrupted images
- Missing required fields in JSON
- Large file handling

---

## Technical Architecture

### Electron Desktop App
- **Main Process (main.js)**: Window management, IPC handlers, native dialogs, file system operations
- **Preload Script (preload.js)**: Secure bridge exposing limited APIs to renderer
- **Renderer Process**: UI and client-side processing
- **Packaging**: electron-builder for Windows/macOS/Linux executables

### Supported Content Types
1. **Images**: PNG, JPG, JPEG, WebP - LSB steganography
2. **Text**: Plain text, Markdown - Metadata encoding
3. **Documents**: PDF, JSON - Embedded metadata layers
4. **Media**: Audio (MP3, WAV), Video (MP4) - Metadata tags

### JSON Schema
```
json
{
  "model": "string",
  "provider": "string",
  "timestamp": "ISO8601 string",
  "signature": "string (base64)",
  "fingerprint": "string (SHA256)",
  "version": "string"
}
```

---

## Acceptance Criteria

1. ✅ JSON config can be pasted and parsed correctly
2. ✅ Invalid JSON shows clear error messages
3. ✅ Image files can be uploaded via drag & drop or file picker
4. ✅ Verification status displays correctly for valid/invalid/unknown
5. ✅ Metadata can be embedded into PNG images using LSB steganography
6. ✅ Watermarked images maintain visual quality
7. ✅ Extracted metadata matches original input
8. ✅ Works on standard hardware without ML dependencies
9. ✅ Responsive design works on mobile/tablet/desktop
10. ✅ All interactions have smooth animations

---

## File Structure

```
XPIITAG/
├── package.json           # Electron dependencies and scripts
├── main.js                # Electron main process
├── preload.js             # Preload script (secure bridge)
├── index.html             # Renderer HTML
├── css/
│   └── styles.css         # All styles
├── js/
│   ├── app.js             # Main application logic
│   ├── json-parser.js     # JSON validation & parsing
│   ├── verifier.js        # Cryptographic verification
│   ├── steganography.js   # LSB watermarking for images
│   ├── text-embedder.js   # Text metadata encoding
│   ├── document-processor.js # PDF/MD/JSON handling
│   └── media-handler.js   # Audio/Video metadata
├── config/
│   └── providers.json     # Provider database & public keys
└── assets/
    └── icons/             # UI icons
```
