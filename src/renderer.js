// DOM Elements
const headerConnectionDot = document.getElementById('headerConnectionDot');
const headerConnectionText = document.getElementById('headerConnectionText');

const connectionCard = document.getElementById('connectionCard');
const connectionDot = document.getElementById('connectionDot');
const connectionText = document.getElementById('connectionText');
const tokenMasked = document.getElementById('tokenMasked');
const addTokenBtn = document.getElementById('addTokenBtn');

const explorerSection = document.getElementById('explorerSection');
const breadcrumb = document.getElementById('breadcrumb');
const explorerList = document.getElementById('explorerList');
const selectedFolderTxt = document.getElementById('selectedFolderTxt');
const selectFolderBtn = document.getElementById('selectFolderBtn');

const confirmSection = document.getElementById('confirmSection');
const confirmFolderTxt = document.getElementById('confirmFolderTxt');
const confirmSkusTxt = document.getElementById('confirmSkusTxt');
const startGenerationBtn = document.getElementById('startGenerationBtn');
const backToExplorerBtn = document.getElementById('backToExplorerBtn');

const progressSection = document.getElementById('progressSection');
const progressSkus = document.getElementById('progressSkus');
const progressImages = document.getElementById('progressImages');
const progressBar = document.getElementById('progressBar');
const progressPercentage = document.getElementById('progressPercentage');
const progressMessage = document.getElementById('progressMessage');

const resultSection = document.getElementById('resultSection');
const summaryBox = document.getElementById('summaryBox');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const startOverBtn = document.getElementById('startOverBtn');
const saveSuccessMsg = document.getElementById('saveSuccessMsg');

const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');

// Modal Elements
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const tokenInput = document.getElementById('tokenInput');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const removeTokenBtn = document.getElementById('removeTokenBtn');
const downloadPathInput = document.getElementById('downloadPathInput');
const selectDownloadPathBtn = document.getElementById('selectDownloadPathBtn');

// State
let currentPath = '';
let targetFolder = '';
let currentPreviewData = null;
let currentMaxImages = 0;

// Initialize
async function init() {
    await checkTokenStatus();
    await loadDownloadPath();
}

async function loadDownloadPath() {
    const manualPath = await window.api.getDownloadFolder();
    if (manualPath) {
        downloadPathInput.value = manualPath;
    } else {
        downloadPathInput.value = '';
    }
}

// Token Management
async function checkTokenStatus() {
    const status = await window.api.getTokenStatus();
    updateConnectionUI(status);
}

function updateConnectionUI(status) {
    if (status.connected) {
        // Update header
        headerConnectionDot.className = 'dot connected';
        headerConnectionText.textContent = 'Connected';
        
        // Update card
        connectionDot.className = 'dot connected';
        connectionText.textContent = 'Connected';
        tokenMasked.textContent = status.tokenMasked;
        tokenMasked.classList.remove('hidden');
        addTokenBtn.textContent = 'Update Token';
        removeTokenBtn.classList.remove('hidden');
        
        // Hide connection card, show explorer
        connectionCard.classList.add('hidden');
        explorerSection.classList.remove('hidden');
        loadFolder('/');
    } else {
        headerConnectionDot.className = 'dot disconnected';
        headerConnectionText.textContent = 'Not Connected';
        
        connectionDot.className = 'dot disconnected';
        connectionText.textContent = status.error || 'Not Connected';
        tokenMasked.classList.add('hidden');
        addTokenBtn.textContent = 'Add Token';
        removeTokenBtn.classList.add('hidden');
        
        connectionCard.classList.remove('hidden');
        explorerSection.classList.add('hidden');
        confirmSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        progressSection.classList.add('hidden');
    }
}

// Event Listeners for Modal
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
addTokenBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

saveTokenBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (token) {
        saveTokenBtn.disabled = true;
        saveTokenBtn.textContent = 'Saving...';
        showError('');

        const status = await window.api.setToken(token);
        
        saveTokenBtn.disabled = false;
        saveTokenBtn.textContent = 'Save Changes';

        if (status.success) {
            tokenInput.value = '';
            settingsModal.classList.add('hidden');
            updateConnectionUI({ connected: true, tokenMasked: status.tokenMasked });
        } else {
            showError('Dropbox token expired or invalid. Please update your Dropbox token.');
            settingsModal.classList.add('hidden');
        }
    } else {
        settingsModal.classList.add('hidden'); // just close if saving empty (paths might have changed)
    }
});

removeTokenBtn.addEventListener('click', async () => {
    await window.api.removeToken();
    settingsModal.classList.add('hidden');
    updateConnectionUI({ connected: false });
});

selectDownloadPathBtn.addEventListener('click', async () => {
    const res = await window.api.selectDownloadFolder();
    if (res.success) {
        downloadPathInput.value = res.path;
    }
});

// Folder Explorer
async function loadFolder(path) {
    currentPath = path;
    selectFolderBtn.disabled = true;
    explorerList.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary);">Loading...</div>';
    
    updateBreadcrumb(path);

    const res = await window.api.listFolder(path);
    if (res.success) {
        renderFolderList(res.folders);
        targetFolder = path; // Default target is current viewing folder
        selectedFolderTxt.textContent = `Selected: ${targetFolder === '' ? '/' : targetFolder}`;
        selectFolderBtn.disabled = false;
    } else {
        showError('Something went wrong. Please check your Dropbox connection and try again.');
        explorerList.innerHTML = '<div style="padding: 1rem; color: var(--danger);">Failed to load folders.</div>';
    }
}

function updateBreadcrumb(path) {
    if (path === '/' || path === '') {
        breadcrumb.innerHTML = '<span class="crumb" data-path="/">Dropbox Root</span>';
    } else {
        const parts = path.split('/').filter(Boolean);
        let html = '<span class="crumb" data-path="/">Dropbox Root</span>';
        let currentBuildPath = '';
        parts.forEach((part) => {
            currentBuildPath += '/' + part;
            html += `<span class="crumb" data-path="${currentBuildPath}">${part}</span>`;
        });
        breadcrumb.innerHTML = html;
    }

    breadcrumb.querySelectorAll('.crumb').forEach(el => {
        el.addEventListener('click', () => {
            if (el.dataset.path !== currentPath) {
                loadFolder(el.dataset.path);
            }
        });
    });
}

function renderFolderList(folders) {
    explorerList.innerHTML = '';
    if (folders.length === 0) {
        explorerList.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary);">No folders found here.</div>';
        return;
    }

    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.innerHTML = `
            <svg class="folder-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
            <span>${folder.name}</span>
        `;
        div.addEventListener('click', () => {
            loadFolder(folder.path_lower);
        });
        explorerList.appendChild(div);
    });
}

// Confirmation Screen
selectFolderBtn.addEventListener('click', async () => {
    explorerSection.classList.add('hidden');
    confirmSection.classList.remove('hidden');
    showError('');
    
    confirmFolderTxt.textContent = targetFolder === '' ? 'Dropbox Root ( / )' : targetFolder;
    confirmSkusTxt.textContent = 'Counting SKUs...';
    startGenerationBtn.disabled = true;

    // Get sku count
    const res = await window.api.listFolder(targetFolder);
    if (res.success) {
        confirmSkusTxt.textContent = `SKU Folders Found: ${res.folders.length}`;
        startGenerationBtn.disabled = res.folders.length === 0;
        if (res.folders.length === 0) {
            showError('No SKU folders found in this location.');
        }
    } else {
        showError('Something went wrong checking the folder.');
        confirmSkusTxt.textContent = 'Error loading SKUs';
    }
});

backToExplorerBtn.addEventListener('click', () => {
    confirmSection.classList.add('hidden');
    explorerSection.classList.remove('hidden');
    showError('');
});

// Excel Generation
startGenerationBtn.addEventListener('click', async () => {
    confirmSection.classList.add('hidden');
    progressSection.classList.remove('hidden');
    showError('');
    
    // Bind progress updates
    window.api.onProgressUpdate((data) => {
        if (data.stage === 'scanning_images') {
            progressSkus.textContent = `${data.skuIndex || 0} / ${data.totalSkus}`;
            progressMessage.textContent = 'Scanning SKU folders...';
            progressBar.style.width = '20%';
            progressPercentage.textContent = '20%';
        } else if (data.stage === 'generating_links') {
            const percent = 20 + Math.floor((data.imagesProcessed / data.totalImages) * 80);
            progressImages.textContent = `${data.imagesProcessed} / ${data.totalImages}`;
            progressMessage.textContent = 'Generating Dropbox links...';
            progressBar.style.width = `${percent}%`;
            progressPercentage.textContent = `${percent}%`;
        }
    });

    const result = await window.api.generateExcel(targetFolder);
    
    window.api.removeProgressUpdate();
    progressSection.classList.add('hidden');

    if (result.success) {
        currentPreviewData = result.data;
        currentMaxImages = result.maxImages;
        showResults(result.summary);
    } else {
        let errorMsg = 'Something went wrong. Please check your Dropbox connection and try again.';
        if (result.error && result.error.includes('sharing permission')) {
            errorMsg = 'Dropbox permission is missing. Please enable sharing permission for your Dropbox app.';
        } else if (result.error && result.error.includes('token')) {
            errorMsg = 'Dropbox token expired. Please update your Dropbox token.';
        }
        showError(errorMsg);
        explorerSection.classList.remove('hidden');
    }
});

function showResults(summary) {
    resultSection.classList.remove('hidden');
    saveSuccessMsg.classList.add('hidden');

    summaryBox.innerHTML = `
        <p><strong>${summary.skus}</strong> SKUs</p>
        <p><strong>${summary.totalImages}</strong> Images</p>
        <p><strong>${summary.linksCreated}</strong> Dropbox Links</p>
    `;
}

// Excel Save
downloadExcelBtn.addEventListener('click', async () => {
    downloadExcelBtn.disabled = true;
    downloadExcelBtn.textContent = 'Saving...';
    
    const parts = targetFolder.split('/').filter(Boolean);
    const targetFolderName = parts.length > 0 ? parts[parts.length - 1] : 'DropboxRoot';

    const res = await window.api.saveExcel({ 
        data: currentPreviewData, 
        maxImages: currentMaxImages,
        targetFolder: targetFolder,
        targetFolderName: targetFolderName
    });
    
    downloadExcelBtn.disabled = false;
    downloadExcelBtn.textContent = 'Download Excel';

    if (res.success) {
        saveSuccessMsg.classList.remove('hidden');
        saveSuccessMsg.textContent = `✓ Excel saved to: ${res.filePath}`;
        downloadExcelBtn.textContent = 'Save Again';
    } else if (!res.canceled) {
        showError('Something went wrong saving the file. Please check permissions and try again.');
    }
});

startOverBtn.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    explorerSection.classList.remove('hidden');
    showError('');
    loadFolder(targetFolder); // Reload current folder
});

function showError(msg) {
    if (msg) {
        errorText.textContent = msg;
        errorBanner.classList.remove('hidden');
    } else {
        errorBanner.classList.add('hidden');
    }
}

// Start
init();
