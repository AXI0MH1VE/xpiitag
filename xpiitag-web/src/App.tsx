import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Tag, 
  FileImage, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Upload,
  Scan,
  Fingerprint,
  Clock,
  Database
} from 'lucide-react'
import { ImageSteganography } from './lib/steganography'
import { TextEmbedder } from './lib/text-embedder'
import { C2PAVerifier, C2PAManifest, C2PAMetadata, VerificationResult } from './lib/verifier'
import providersData from './config/providers.json'

type Tab = 'tag' | 'verify'
type ContentType = 'image' | 'text'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tag')
  const [contentType, setContentType] = useState<ContentType>('image')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [textContent, setTextContent] = useState('')
  const [jsonConfig, setJsonConfig] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    dataUrl?: string;
    metadata?: C2PAMetadata;
    manifest?: C2PAManifest;
    verification?: VerificationResult;
  } | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.type.startsWith('image/') || file.type === 'text/plain')) {
      setSelectedFile(file)
      setResult(null)
    }
  }

  const generateSampleManifest = async (): Promise<C2PAManifest> => {
    const provider = providersData.providers[0]
    const sampleContent = 'Sample AI-generated content for attribution'
    return await C2PAVerifier.createManifest(
      provider.name,
      provider.models[0],
      sampleContent,
      {
        title: 'AI Generated Content',
        creator: provider.name
      }
    )
  }

  const handleTag = async () => {
    if (!selectedFile && !textContent) {
      setResult({ success: false, message: 'Please select a file or enter text' })
      return
    }

    setIsProcessing(true)
    
    try {
      if (contentType === 'image' && selectedFile) {
        const manifest = await generateSampleManifest()
        const embedResult = await ImageSteganography.embed(selectedFile, manifest as unknown as Record<string, unknown>)
        
        if (embedResult.success && embedResult.dataUrl) {
          setResult({
            success: true,
            message: 'C2PA manifest embedded successfully',
            dataUrl: embedResult.dataUrl,
            manifest,
            metadata: manifest['c2pa:claim']['c2pa:metadata'] || undefined
          })
        } else {
          setResult({
            success: false,
            message: embedResult.error || 'Failed to embed metadata'
          })
        }
      } else if (contentType === 'text' && textContent) {
        const manifest = await generateSampleManifest()
        const embedResult = TextEmbedder.embed(textContent, manifest as unknown as Record<string, unknown>)
        
        if (embedResult.success && embedResult.text) {
          setResult({
            success: true,
            message: 'C2PA manifest embedded successfully',
            manifest,
            metadata: manifest['c2pa:claim']['c2pa:metadata'] || undefined
          })
          navigator.clipboard.writeText(embedResult.text)
        } else {
          setResult({
            success: false,
            message: embedResult.error || 'Failed to embed metadata'
          })
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVerify = async () => {
    if (!selectedFile && !textContent && !jsonConfig) {
      setResult({ success: false, message: 'Please provide content to verify' })
      return
    }

    setIsProcessing(true)
    
    try {
      if (contentType === 'image' && selectedFile) {
        const extractResult = await ImageSteganography.extract(selectedFile)
        
        if (extractResult.success && extractResult.metadata) {
          const verification = await C2PAVerifier.verify(extractResult.metadata)
          setResult({
            success: verification.valid,
            message: verification.valid ? 'Verification successful' : 'Verification failed',
            verification
          })
        } else {
          setResult({
            success: false,
            message: extractResult.error || 'No metadata found'
          })
        }
      } else if (contentType === 'text' && textContent) {
        const extractResult = TextEmbedder.extract(textContent)
        
        if (extractResult.success && extractResult.metadata) {
          const verification = await C2PAVerifier.verify(extractResult.metadata)
          setResult({
            success: verification.valid,
            message: verification.valid ? 'Verification successful' : 'Verification failed',
            verification,
            metadata: extractResult.metadata as unknown as C2PAMetadata
          })
        } else {
          setResult({
            success: false,
            message: extractResult.error || 'No metadata found'
          })
        }
      } else if (jsonConfig) {
        try {
          const manifest = JSON.parse(jsonConfig)
          const verification = await C2PAVerifier.verify(manifest)
          setResult({
            success: verification.valid,
            message: verification.valid ? 'C2PA manifest valid' : 'C2PA manifest invalid',
            verification,
            manifest,
            metadata: manifest['c2pa:claim']?.['c2pa:metadata']
          })
        } catch {
          setResult({
            success: false,
            message: 'Invalid JSON format'
          })
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTaggedImage = () => {
    if (result?.dataUrl) {
      const link = document.createElement('a')
      link.href = result.dataUrl
      link.download = `tagged-${selectedFile?.name || 'image'}.png`
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-matte-900 text-white">
      {/* Header */}
      <header className="border-b border-matte-600/50 bg-matte-800/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-gradient">XPIITAG</h1>
              <p className="text-xs text-gray-400">AI Content Attribution & Watermarking</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-matte-800/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('tag')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-mono font-medium transition-all duration-200 ${
              activeTab === 'tag' 
                ? 'bg-neon-blue/20 text-neon-blue shadow-[0_0_20px_rgba(0,212,255,0.1)]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            Tag Content
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-mono font-medium transition-all duration-200 ${
              activeTab === 'verify' 
                ? 'bg-neon-blue/20 text-neon-blue shadow-[0_0_20px_rgba(0,212,255,0.1)]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Scan className="w-4 h-4" />
            Verify
          </button>
        </div>

        {/* Content Type Selector */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setContentType('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              contentType === 'image'
                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                : 'bg-matte-800 text-gray-400 border border-matte-600'
            }`}
          >
            <FileImage className="w-4 h-4" />
            Image
          </button>
          <button
            onClick={() => setContentType('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              contentType === 'text'
                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                : 'bg-matte-800 text-gray-400 border border-matte-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            Text
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            {/* File Upload / Text Input */}
            <div className="glass-panel p-6">
              <h3 className="text-sm font-mono font-medium text-gray-300 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-neon-blue" />
                {contentType === 'image' ? 'Upload Image' : 'Enter Text'}
              </h3>
              
              {contentType === 'image' ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-matte-600 rounded-xl p-12 text-center hover:border-neon-blue/50 transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-matte-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">Drop image here or click to browse</p>
                    <p className="text-xs text-matte-500">Supports PNG, JPG, WebP</p>
                  </label>
                  {selectedFile && (
                    <p className="mt-4 text-sm text-neon-green font-mono">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste or type text content here..."
                  className="input-field w-full h-48 resize-none"
                />
              )}
            </div>

            {/* JSON Config (for verification) */}
            {activeTab === 'verify' && (
              <div className="glass-panel p-6">
                <h3 className="text-sm font-mono font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-neon-purple" />
                  JSON Metadata (Optional)
                </h3>
                <textarea
                  value={jsonConfig}
                  onChange={(e) => setJsonConfig(e.target.value)}
                  placeholder='{"@context": ["https://c2pa.org/2.0"], "c2pa:claim": {...}}'
                  className="input-field w-full h-32 resize-none font-mono text-xs"
                />
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={activeTab === 'tag' ? handleTag : handleVerify}
              disabled={isProcessing}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Scan className="w-5 h-5" />
                </motion.div>
              ) : activeTab === 'tag' ? (
                <>
                  <Tag className="w-5 h-5" />
                  Tag Content
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Verify Content
                </>
              )}
            </button>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-6"
                >
                  {/* Status Header */}
                  <div className="flex items-center gap-3 mb-6">
                    {result.success ? (
                      <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-neon-green" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      </div>
                    )}
                    <div>
                      <h3 className={`font-mono font-bold ${result.success ? 'text-neon-green' : 'text-red-400'}`}>
                        {result.success ? 'Success' : 'Failed'}
                      </h3>
                      <p className="text-sm text-gray-400">{result.message}</p>
                    </div>
                  </div>

                  {/* Verification Details */}
                  {result.verification && (
                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-matte-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Provider</p>
                          <p className="font-mono text-sm text-white">{result.verification.provider || 'Unknown'}</p>
                        </div>
                        <div className="bg-matte-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Model</p>
                          <p className="font-mono text-sm text-white">{result.verification.model || 'Unknown'}</p>
                        </div>
                        <div className="bg-matte-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Timestamp</p>
                          <p className="font-mono text-sm text-white">
                            {result.verification.timestamp 
                              ? new Date(result.verification.timestamp).toLocaleString() 
                              : 'Unknown'}
                          </p>
                        </div>
                        <div className="bg-matte-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Processing Time</p>
                          <p className="font-mono text-xs text-neon-blue">
                            {result.verification.processing_time_ms}ms
                          </p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex gap-2 flex-wrap">
                        <span className={`status-badge ${result.verification.valid ? 'status-valid' : 'status-invalid'}`}>
                          {result.verification.valid ? 'C2PA Valid' : 'C2PA Invalid'}
                        </span>
                        <span className={`status-badge ${result.verification.signature_valid ? 'status-valid' : 'status-invalid'}`}>
                          Signature {result.verification.signature_valid ? '✓' : '✗'}
                        </span>
                        <span className={`status-badge ${result.verification.certificate_valid ? 'status-valid' : 'status-unknown'}`}>
                          Certificate {result.verification.certificate_valid ? '✓' : '✗'}
                        </span>
                        {result.verification.tampered && (
                          <span className="status-badge status-invalid">Tampered</span>
                        )}
                      </div>

                      {/* Errors & Warnings */}
                      {result.verification.errors.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-xs text-red-400 font-mono mb-2">Errors:</p>
                          {result.verification.errors.map((err, i) => (
                            <p key={i} className="text-xs text-red-300">• {err}</p>
                          ))}
                        </div>
                      )}
                      {result.verification.warnings.length > 0 && (
                        <div className="bg-neon-amber/10 border border-neon-amber/30 rounded-lg p-3">
                          <p className="text-xs text-neon-amber font-mono mb-2">Warnings:</p>
                          {result.verification.warnings.map((warn, i) => (
                            <p key={i} className="text-xs text-amber-300">• {warn}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata Display */}
                  {result.metadata && (
                    <div className="bg-matte-900/50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-gray-500 mb-2 font-mono">Extracted Metadata:</p>
                      <pre className="text-xs font-mono text-gray-300 overflow-x-auto">
                        {JSON.stringify(result.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Download Button */}
                  {result.dataUrl && (
                    <button
                      onClick={downloadTaggedImage}
                      className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Tagged Image
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!result && (
              <div className="glass-panel p-12 text-center">
                <Fingerprint className="w-16 h-16 text-matte-600 mx-auto mb-4" />
                <p className="text-gray-500 font-mono">
                  {activeTab === 'tag' 
                    ? 'Tagged content will appear here' 
                    : 'Verification results will appear here'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-matte-600/50 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
            <div className="flex items-center gap-4">
              <span>XPIITAG v1.0</span>
              <span>•</span>
              <span>Hardware Agnostic</span>
              <span>•</span>
              <span>Zero Egress</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
