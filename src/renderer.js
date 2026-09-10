const headerConnectionDot = document.getElementById('headerConnectionDot');
const headerConnectionText = document.getElementById('headerConnectionText');
const userDisplayGroup = document.getElementById('userDisplayGroup');
const userDisplay = document.getElementById('userDisplay');
const logoutBtn = document.getElementById('logoutBtn');

const authView = document.getElementById('authView');
const dashboardView = document.getElementById('dashboardView');
const profileView = document.getElementById('profileView');
const loginCard = document.getElementById('loginCard');
const registerCard = document.getElementById('registerCard');

const profileNameTxt = document.getElementById('profileNameTxt');
const profileMobileTxt = document.getElementById('profileMobileTxt');
const profileEmailTxt = document.getElementById('profileEmailTxt');
const backToDashboardBtn = document.getElementById('backToDashboardBtn');

const loginIdentifier = document.getElementById('loginIdentifier');
const loginPassword = document.getElementById('loginPassword');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const showRegisterLink = document.getElementById('showRegisterLink');

const registerName = document.getElementById('registerName');
const registerMobile = document.getElementById('registerMobile');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerConfirmPassword = document.getElementById('registerConfirmPassword');
const registerSubmitBtn = document.getElementById('registerSubmitBtn');
const showLoginLink = document.getElementById('showLoginLink');

const connectionCard = document.getElementById('connectionCard');
const connectionDot = document.getElementById('connectionDot');
const connectionText = document.getElementById('connectionText');
const tokenMasked = document.getElementById('tokenMasked');
const addTokenBtn = document.getElementById('addTokenBtn');

const explorerSection = document.getElementById('explorerSection');
const searchInput = document.getElementById('searchInput');
const searchFolderBtn = document.getElementById('searchFolderBtn');
const browseFilesBtn = document.getElementById('browseFilesBtn');
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

// Footer Links
const helpLink = document.getElementById('helpLink');
const labelprimeLink = document.getElementById('labelprimeLink');
const appVersionTxt = document.getElementById('appVersionTxt');

// State
let currentPath = '';
let targetFolder = '';
let currentPreviewData = null;
let currentMaxImages = 0;
let currentUser = null;

// Initialize
async function init() {
    if (appVersionTxt && window.api.getVersion) {
        try {
            const version = await window.api.getVersion();
            appVersionTxt.textContent = `Version ${version}`;
        } catch (e) {
            console.error('Failed to load version:', e);
        }
    }

    if (helpLink) {
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.api.openExternal) {
                window.api.openExternal('https://www.labelprime.in/contact');
            }
        });
    }

    if (labelprimeLink) {
        labelprimeLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.api.openExternal) {
                window.api.openExternal('https://www.labelprime.in/');
            }
        });
    }

    await checkAuthSession();
    await loadDownloadPath();
}

// Authentication Logic
async function checkAuthSession() {
    const res = await window.api.checkSession();
    if (res && res.success) {
        showDashboard(res.user);
    } else {
        showLogin();
    }
}

function showDashboard(user) {
    if (user) currentUser = user;
    authView.classList.add('hidden');
    profileView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    userDisplay.textContent = currentUser.displayName || currentUser.name || currentUser.email || currentUser.mobile;
    userDisplayGroup.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');

    document.getElementById('headerConnectionGroup').classList.remove('hidden');
    document.getElementById('settingsBtn').classList.remove('hidden');

    // Resume normal dashboard init
    checkTokenStatus();
}

function showLogin() {
    dashboardView.classList.add('hidden');
    profileView.classList.add('hidden');
    authView.classList.remove('hidden');
    loginCard.classList.remove('hidden');
    registerCard.classList.add('hidden');
    userDisplayGroup.classList.add('hidden');
    logoutBtn.classList.add('hidden');

    document.getElementById('headerConnectionGroup').classList.add('hidden');
    document.getElementById('settingsBtn').classList.add('hidden');

    showError(''); // clear global errors
}

function showProfile() {
    console.log('--- showProfile currentUser ---', currentUser);
    dashboardView.classList.add('hidden');
    profileView.classList.remove('hidden');

    profileNameTxt.textContent = currentUser.displayName || currentUser.name || 'Not provided';
    profileMobileTxt.textContent = currentUser.mobile || currentUser.phoneNumber || 'Not provided';
    profileEmailTxt.textContent = currentUser.email || 'Not provided';
}

userDisplayGroup.addEventListener('click', () => {
    if (!dashboardView.classList.contains('hidden')) {
        showProfile();
    }
});

backToDashboardBtn.addEventListener('click', () => {
    showDashboard();
});

function showRegister() {
    loginCard.classList.add('hidden');
    registerCard.classList.remove('hidden');
    clearAuthErrors();
}

showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
});

logoutBtn.addEventListener('click', async () => {
    await window.api.logout();
    showLogin();
});

function togglePassword(inputId) {
    const el = document.getElementById(inputId);
    if (el.type === 'password') {
        el.type = 'text';
    } else {
        el.type = 'password';
    }
}

function clearAuthErrors() {
    document.querySelectorAll('.error-text').forEach(e => e.remove());
    document.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));
}

function showFieldError(inputElement, message) {
    inputElement.classList.add('input-error');
    const err = document.createElement('span');
    err.className = 'error-text';
    err.textContent = message;
    inputElement.parentNode.appendChild(err);
}

// Register
registerSubmitBtn.addEventListener('click', async () => {
    clearAuthErrors();
    const name = registerName.value.trim();
    const mobile = registerMobile.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    let hasError = false;

    // Name Validation
    if (!name) {
        showFieldError(registerName, 'Please enter your full name.');
        hasError = true;
    }

    // Mobile Validation
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
        showFieldError(registerMobile, 'Please enter a valid 10-digit mobile number.');
        hasError = true;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showFieldError(registerEmail, 'Please enter a valid email address.');
        hasError = true;
    }

    // Password Validation
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(password)) {
        showFieldError(registerPassword.parentNode, 'Password must contain at least 8 characters, including uppercase, lowercase, and a number.');
        hasError = true;
    }

    // Confirm Password
    if (password !== confirmPassword) {
        showFieldError(registerConfirmPassword.parentNode, 'Passwords do not match.');
        hasError = true;
    }

    if (hasError) return;

    registerSubmitBtn.disabled = true;
    registerSubmitBtn.textContent = 'Creating Account...';

    const res = await window.api.register({ name, mobile, email, password });

    registerSubmitBtn.disabled = false;
    registerSubmitBtn.textContent = 'Create Account';

    if (res.success) {
        showDashboard(res.user);
    } else {
        showFieldError(registerSubmitBtn, res.error || 'Registration failed.');
    }
});

// Login
loginSubmitBtn.addEventListener('click', async () => {
    clearAuthErrors();
    const identifier = loginIdentifier.value.trim();
    const password = loginPassword.value;

    let hasError = false;
    if (!identifier) {
        showFieldError(loginIdentifier, 'Please enter your email or mobile number.');
        hasError = true;
    }
    if (!password) {
        showFieldError(loginPassword.parentNode, 'Please enter your password.');
        hasError = true;
    }
    if (hasError) return;

    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Signing In...';

    const res = await window.api.login({ identifier, password });

    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = 'Login';

    if (res.success) {
        showDashboard(res.user);
    } else {
        showFieldError(loginSubmitBtn, res.error || 'Invalid email/mobile or password.');
    }
});


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
            showError(status.error || 'Dropbox token expired or invalid. Please update your Dropbox token.');
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

// Search Folder Logic
searchFolderBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) {
        // Reload current folder if search is empty (acts as clear search)
        loadFolder(currentPath || '/');
        return;
    }

    explorerList.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary);">Searching Dropbox...</div>';
    showError('');

    const res = await window.api.searchFolder(query);
    if (res.success) {
        renderFolderList(res.folders);
        searchInput.value = ''; // Clear input after showing results
    } else {
        showError('Something went wrong searching folders.');
        explorerList.innerHTML = '<div style="padding: 1rem; color: var(--danger);">Search failed.</div>';
    }
});

const refreshAppBtn = document.getElementById('refreshAppBtn');
if (refreshAppBtn) {
    refreshAppBtn.addEventListener('click', () => {
        window.location.reload();
    });
}

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchFolderBtn.click();
});

function renderFolderList(folders) {
    explorerList.innerHTML = '';
    if (folders.length === 0) {
        explorerList.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary);">No folders found.</div>';
        return;
    }

    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.innerHTML = `
            <svg class="folder-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
            <span>${folder.path_display || folder.name}</span>
        `;
        div.addEventListener('click', () => {
            loadFolder(folder.path_lower);
        });
        explorerList.appendChild(div);
    });
}

// Browse Files Logic
browseFilesBtn.addEventListener('click', async () => {
    showError('');
    browseFilesBtn.disabled = true;
    browseFilesBtn.textContent = 'Browsing...';

    const res = await window.api.selectTargetFolder();

    browseFilesBtn.disabled = false;
    browseFilesBtn.textContent = 'Browse Files...';

    if (res.success) {
        selectTargetFolder(res.apiPath, res.localPath);
    } else if (!res.canceled) {
        showError(res.error || 'Failed to select folder.');
    }
});

// Folder Explorer (Navigation)
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

// Confirmation Screen
selectFolderBtn.addEventListener('click', () => {
    selectTargetFolder(targetFolder, targetFolder === '' ? 'Dropbox Root ( / )' : targetFolder);
});

async function selectTargetFolder(apiPath, displayPath) {
    targetFolder = apiPath;

    explorerSection.classList.add('hidden');
    confirmSection.classList.remove('hidden');
    showError('');

    confirmFolderTxt.textContent = displayPath || (targetFolder === '' ? 'Dropbox Root ( / )' : targetFolder);
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
}

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
        let errorMsg = result.error || 'Something went wrong. Please check your Dropbox connection and try again.';

        // If it's a generic connection error but result.error isn't explicitly set, fallback to defaults
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
        showError(res.error || 'Something went wrong saving the file. Please check permissions and try again.');
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
