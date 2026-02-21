/**
 * XPIITAG - Main Application Logic
 * Coordinates all modules and handles UI interactions
 */

const App = (function() {
    // Application state
    let state = {
        jsonConfig: null,
        parsedConfig: null,
        file: null,
        fileData: null,
        fileType: null,
        watermarkedData: null,
        verificationResult: null,
        extractedMetadata: null
    };

    // DOM Elements
    let elements = {};

    /**
     * Initialize the application
     */
    function init() {
        console.log('XPIITAG initializing...');
        
        // Cache DOM elements
        cacheElements();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup Electron IPC
        setupElectronIPC();
        
        console.log('XPIITAG initialized');
    }

    /**
     * Cache DOM elements for quick access
     */
    function cacheElements() {
        elements = {
            // JSON Editor
            jsonInput: document.getElementById('json-input'),
            jsonStatus: document.getElementById('json-status'),
            btnValidate: document.getElementById('btn-validate'),
            
            // File Upload
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('file-input'),
            btnBrowse: document.getElementById('btn-browse'),
            btnRemoveFile: document.getElementById('btn-remove-file'),
            fileInfo: document.getElementById('file-info'),
            dropZoneContent: document.querySelector('.drop-zone-content'),
            fileName: document.getElementById('file-name'),
            fileSize: document.getElementById('file-size'),
            
            // Parsed JSON
            parsedJsonSection: document.getElementById('parsed-json-section'),
            parsedModel: document.getElementById('parsed-model'),
            parsedProvider: document.getElementById('parsed-provider'),
            parsedTimestamp: document.getElementById('parsed-timestamp'),
            parsedFingerprint: document.getElementById('parsed-fingerprint'),
            
            // Actions
            btnVerify: document.getElementById('btn-verify'),
            btnEmbed: document.getElementById('btn-embed'),
            btnDownload: document.getElementById('btn-download'),
            
            // Verification
            verificationSection: document.getElementById('verification-section'),
            statusIndicator: document.getElementById('status-indicator'),
            
            // Preview
            previewSection: document.getElementById('preview-section'),
            previewOriginal: document.getElementById('preview-original'),
            previewWatermarked: document.getElementById('preview-watermarked'),
            previewMetadata: document.getElementById('preview-metadata'),
            imagePreview: document.getElementById('image-preview'),
            textPreview: document.getElementById('text-preview'),
            previewImg: document.getElementById('preview-img'),
            previewTextContent: document.getElementById('preview-text-content'),
            watermarkedImg: document.getElementById('watermarked-img'),
            metadataJson: document.getElementById('metadata-json'),
            
            // Output
            outputSection: document.getElementById('output-section'),
            outputFilename: document.getElementById('output-filename'),
            
            // Navigation
            btnNew: document.getElementById('btn-new'),
            btnOpen: document.getElementById('btn-open')
        };
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // JSON Input
        elements.jsonInput.addEventListener('input', debounce(handleJsonInput, 300));
        elements.btnValidate.addEventListener('click', handleValidate);
        
        // File Upload
        elements.btnBrowse.addEventListener('click', () => elements.fileInput.click());
        elements.fileInput.addEventListener('change', handleFileSelect);
        elements.btnRemoveFile.addEventListener('click', handleRemoveFile);
        
        // Drag and Drop
        elements.dropZone.addEventListener('dragover', handleDragOver);
        elements.dropZone.addEventListener('dragleave', handleDragLeave);
        elements.dropZone.addEventListener('drop', handleDrop);
        
        // Actions
        elements.btnVerify.addEventListener('click', handleVerify);
        elements.btnEmbed.addEventListener('click', handleEmbed);
        elements.btnDownload.addEventListener('click', handleDownload);
        
        // Navigation
        elements.btnNew.addEventListener('click', handleNew);
        elements.btnOpen.addEventListener('click', handleOpenFile);
        
        // Preview Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', handleTabClick);
        });
    }

    /**
     * Setup Electron IPC listeners
     */
    function setupElectronIPC() {
        if (!window.electronAPI) {
            console.warn('Electron API not available');
            return;
        }
        
        window.electronAPI.onFileOpened(handleFileOpened);
        window.electronAPI.onFileError(handleFileError);
        window.electronAPI.onMenuSave(handleSave);
    }

    // Event Handlers
    
    function handleJsonInput() {
        const json = elements.jsonInput.value.trim();
        
        if (!json) {
            state.jsonConfig = null;
            state.parsedConfig = null;
            updateJsonStatus('Ready', '');
            hideParsedJson();
            updateActionButtons();
            return;
        }
        
        // Try to validate immediately
        try {
            const parsed = JSONParser.parse(json);
            state.jsonConfig = json;
            state.parsedConfig = parsed;
            updateJsonStatus('Valid', 'valid');
            displayParsedJson(parsed);
            updateActionButtons();
        } catch (e) {
            state.jsonConfig = json;
            state.parsedConfig = null;
            updateJsonStatus(e.message, 'invalid');
            hideParsedJson();
            updateActionButtons();
        }
    }

    function handleValidate() {
        const json = elements.jsonInput.value.trim();
        
        if (!json) {
            updateJsonStatus('Please enter JSON', 'invalid');
            return;
        }
        
        try {
            const parsed = JSONParser.parse(json);
            state.jsonConfig = json;
            state.parsedConfig = parsed;
            updateJsonStatus('Valid', 'valid');
            displayParsedJson(parsed);
            updateActionButtons();
        } catch (e) {
            state.jsonConfig = json;
            state.parsedConfig = null;
            updateJsonStatus(e.message, 'invalid');
            hideParsedJson();
            updateActionButtons();
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            loadFile(file);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            loadFile(files[0]);
        }
    }

    function handleRemoveFile() {
        state.file = null;
        state.fileData = null;
        state.fileType = null;
        state.watermarkedData = null;
        
        elements.fileInput.value = '';
        elements.dropZoneContent.classList.remove('hidden');
        elements.fileInfo.classList.add('hidden');
        
        hidePreview();
        hideOutput();
        updateActionButtons();
    }

    async function handleFileOpened(data) {
        console.log('File opened:', data.name);
        
        // Create a File-like object
        const response = await fetch('data:application/octet-stream;base64,' + data.data);
        const blob = await response.blob();
        const file = new File([blob], data.name, { type: blob.type });
        
        loadFile(file, data.extension);
    }

    function handleFileError(error) {
        console.error('File error:', error);
        alert('Error reading file: ' + error);
    }

    async function loadFile(file, forcedExtension = null) {
        try {
            const extension = forcedExtension || file.name.split('.').pop();
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const base64 = e.target.result.split(',')[1];
                
                state.file = file;
                state.fileData = base64;
                state.fileType = determineFileType(extension);
                
                // Display file info
                elements.dropZoneContent.classList.add('hidden');
                elements.fileInfo.classList.remove('hidden');
                elements.fileName.textContent = file.name;
                elements.fileSize.textContent = formatFileSize(file.size);
                
                // Try to extract metadata if it's a watermarked file
                extractExistingMetadata(base64, extension);
                
                // Show preview
                showPreview(base64, extension);
                
                // Enable buttons
                updateActionButtons();
            };
            
            reader.onerror = function() {
                console.error('Error reading file');
                alert('Error reading file');
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error loading file:', error);
            alert('Error loading file: ' + error.message);
        }
    }

    function determineFileType(extension) {
        const ext = extension.toLowerCase();
        
        // Images
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
            return 'image';
        }
        
        // Text/Documents
        if (['txt', 'md', 'markdown', 'json'].includes(ext)) {
            return 'text';
        }
        
        // Media
        if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
            return 'audio';
        }
        
        if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
            return 'video';
        }
        
        // PDF
        if (['pdf'].includes(ext)) {
            return 'pdf';
        }
        
        return 'unknown';
    }

    async function extractExistingMetadata(base64, extension) {
        try {
            const fileType = determineFileType(extension);
            
            if (fileType === 'image') {
                const metadata = await Steganography.extractFromBase64(base64);
                if (metadata) {
                    state.extractedMetadata = metadata;
                    console.log('Found existing watermark:', metadata);
                }
            } else if (fileType === 'text') {
                const text = atob(base64);
                const metadata = TextEmbedder.autoExtract(text);
                if (metadata) {
                    state.extractedMetadata = metadata;
                    console.log('Found existing watermark:', metadata);
                }
            }
        } catch (error) {
            console.warn('Could not extract metadata:', error);
        }
    }

    function showPreview(base64, extension) {
        const fileType = determineFileType(extension);
        
        elements.previewSection.classList.remove('hidden');
        
        if (fileType === 'image') {
            elements.imagePreview.classList.remove('hidden');
            elements.textPreview.classList.add('hidden');
            elements.previewImg.src = 'data:image/' + extension + ';base64,' + base64;
        } else if (fileType === 'text') {
            elements.imagePreview.classList.add('hidden');
            elements.textPreview.classList.remove('hidden');
            elements.previewTextContent.textContent = atob(base64);
        }
    }

    function hidePreview() {
        elements.previewSection.classList.add('hidden');
    }

    function hideOutput() {
        elements.outputSection.classList.add('hidden');
    }

    async function handleVerify() {
        if (!state.parsedConfig || !state.fileData) {
            return;
        }
        
        try {
            // Convert base64 to ArrayBuffer
            const binaryString = atob(state.fileData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Verify
            const result = await Verifier.verifyComplete(state.parsedConfig, bytes.buffer);
            state.verificationResult = result;
            
            // Update UI
            displayVerificationResult(result);
        } catch (error) {
            console.error('Verification error:', error);
            displayVerificationResult({
                overall: 'invalid',
                error: error.message
            });
        }
    }

    async function handleEmbed() {
        if (!state.parsedConfig || !state.fileData) {
            return;
        }
        
        try {
            // Prepare metadata
            const metadata = {
                model: state.parsedConfig.model,
                provider: state.parsedConfig.provider,
                timestamp: state.parsedConfig.timestamp,
                signature: state.parsedConfig.signature || await Verifier.generateSignature(state.parsedConfig),
                fingerprint: state.parsedConfig.fingerprint || await Verifier.generateFingerprint(state.fileData),
                version: state.parsedConfig.version || '1.0'
            };
            
            const extension = state.file.name.split('.').pop();
            const fileType = determineFileType(extension);
            
            let result;
            
            if (fileType === 'image') {
                result = await Steganography.embedInBase64(state.fileData, metadata);
            } else if (fileType === 'text') {
                const text = atob(state.fileData);
                const watermarked = TextEmbedder.autoEmbed(text, metadata);
                result = btoa(watermarked);
            } else {
                throw new Error('Unsupported file type for embedding');
            }
            
            state.watermarkedData = result;
            
            // Show watermarked preview
            if (fileType === 'image') {
                elements.previewWatermarked.querySelector('img').src = 'data:image/png;base64,' + result;
            }
            
            // Show output
            const outputName = 'watermarked_' + state.file.name;
            elements.outputFilename.textContent = outputName;
            elements.outputSection.classList.remove('hidden');
            
            // Switch to watermarked tab
            document.querySelector('[data-tab="watermarked"]').click();
            
        } catch (error) {
            console.error('Embedding error:', error);
            alert('Error embedding watermark: ' + error.message);
        }
    }

    async function handleDownload() {
        if (!state.watermarkedData) {
            return;
        }
        
        try {
            const outputName = 'watermarked_' + state.file.name;
            
            if (window.electronAPI) {
                const result = await window.electronAPI.saveFile(
                    state.watermarkedData,
                    outputName,
                    [{ name: 'All Files', extensions: ['*'] }]
                );
                
                if (result.success) {
                    console.log('File saved:', result.path);
                }
            } else {
                // Fallback for browser
                const link = document.createElement('a');
                link.href = 'data:application/octet-stream;base64,' + state.watermarkedData;
                link.download = outputName;
                link.click();
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('Error saving file: ' + error.message);
        }
    }

    function handleNew() {
        // Reset state
        state = {
            jsonConfig: null,
            parsedConfig: null,
            file: null,
            fileData: null,
            fileType: null,
            watermarkedData: null,
            verificationResult: null,
            extractedMetadata: null
        };
        
        // Reset UI
        elements.jsonInput.value = '';
        elements.dropZoneContent.classList.remove('hidden');
        elements.fileInfo.classList.add('hidden');
        
        updateJsonStatus('Ready', '');
        hideParsedJson();
        hidePreview();
        hideOutput();
        updateActionButtons();
        
        // Reset verification status
        elements.statusIndicator.className = 'status-indicator';
    }

    async function handleOpenFile() {
        if (window.electronAPI) {
            await window.electronAPI.openFileDialog();
        } else {
            elements.fileInput.click();
        }
    }

    function handleSave() {
        if (state.watermarkedData) {
            handleDownload();
        }
    }

    function handleTabClick(e) {
        const tab = e.target.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Update panes
        document.querySelectorAll('.preview-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === 'preview-' + tab);
        });
    }

    // UI Update Functions

    function updateJsonStatus(message, type) {
        elements.jsonStatus.textContent = message;
        elements.jsonStatus.className = 'status-text';
        if (type) {
            elements.jsonStatus.classList.add(type);
        }
    }

    function displayParsedJson(parsed) {
        const display = JSONParser.formatForDisplay(parsed);
        
        elements.parsedModel.textContent = parsed.model;
        elements.parsedProvider.textContent = display.provider;
        elements.parsedTimestamp.textContent = display.timestamp;
        elements.parsedFingerprint.textContent = display.fingerprint;
        
        elements.parsedJsonSection.classList.remove('hidden');
    }

    function hideParsedJson() {
        elements.parsedJsonSection.classList.add('hidden');
    }

    function displayVerificationResult(result) {
        const statusInfo = Verifier.getStatusDisplay(result.overall);
        
        elements.statusIndicator.className = 'status-indicator ' + statusInfo.class;
        
        // Update status icon
        const iconSvg = elements.statusIndicator.querySelector('.status-icon svg');
        
        if (result.overall === 'valid') {
            iconSvg.innerHTML = `
                <circle cx="24" cy="24" r="20" stroke="#3FB950" stroke-width="2" fill="none"/>
                <path d="M16 24l4 4 8-8" stroke="#3FB950" stroke-width="2" fill="none" stroke-linecap="round"/>
            `;
        } else if (result.overall === 'invalid') {
            iconSvg.innerHTML = `
                <circle cx="24" cy="24" r="20" stroke="#F85149" stroke-width="2" fill="none"/>
                <path d="M16 16l8 8M24 16l-8 8" stroke="#F85149" stroke-width="2" fill="none" stroke-linecap="round"/>
            `;
        } else {
            iconSvg.innerHTML = `
                <circle cx="24" cy="24" r="20" stroke="#D29922" stroke-width="2" fill="none"/>
                <path d="M24 14v10M24 28v2" stroke="#D29922" stroke-width="2" stroke-linecap="round"/>
            `;
        }
        
        // Update status text
        const statusContent = elements.statusIndicator.querySelector('.status-content');
        statusContent.innerHTML = `
            <span class="status-title">${statusInfo.title}</span>
            <span class="status-description">${statusInfo.description}</span>
        `;
        
        // Show metadata if available
        if (state.parsedConfig) {
            elements.metadataJson.textContent = JSON.stringify(state.parsedConfig, null, 2);
        }
    }

    function updateActionButtons() {
        const hasJson = state.parsedConfig !== null;
        const hasFile = state.fileData !== null;
        
        elements.btnVerify.disabled = !hasJson || !hasFile;
        elements.btnEmbed.disabled = !hasJson || !hasFile;
    }

    // Utility Functions

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        getState: () => state,
        handleNew: handleNew,
        handleVerify: handleVerify,
        handleEmbed: handleEmbed
    };
})();
