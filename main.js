const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const crypto = require('crypto');
const { Dropbox } = require('dropbox');
const ExcelJS = require('exceljs');
let fetch; // for dropbox

// Initialize electron-store
let store;

let mainWindow;

async function createWindow() {
  // Dynamically import electron-store and node-fetch
  const StoreModule = await import('electron-store');
  store = new StoreModule.default();

  fetch = (await import('node-fetch')).default;

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Dropbox SKU Excel Generator',
    icon: path.join(__dirname, 'logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('src/index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Helper to instantiate dropbox with fetch
function getDbx(token) {
  return new Dropbox({ accessToken: token, fetch: fetch });
}

// IPC Handlers

ipcMain.handle('dropbox:getTokenStatus', async () => {
  const token = store.get('dropboxToken');
  if (!token) return { connected: false };
  
  try {
    const dbx = getDbx(token);
    await dbx.usersGetCurrentAccount();
    return { connected: true, tokenMasked: '••••••••••••' + token.slice(-4) };
  } catch (error) {
    return { connected: false, error: 'Token invalid or expired' };
  }
});

ipcMain.handle('dropbox:setToken', async (event, token) => {
  try {
    const dbx = getDbx(token);
    await dbx.usersGetCurrentAccount();
    store.set('dropboxToken', token);
    return { success: true, tokenMasked: '••••••••••••' + token.slice(-4) };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
});

ipcMain.handle('dropbox:removeToken', async () => {
  store.delete('dropboxToken');
  return true;
});

ipcMain.handle('dropbox:listFolder', async (event, folderPath) => {
  const token = store.get('dropboxToken');
  if (!token) throw new Error('Not connected');
  
  try {
    const dbx = getDbx(token);
    const response = await dbx.filesListFolder({ path: folderPath === '/' ? '' : folderPath });
    
    // Filter out files, keep only folders for navigation
    const folders = response.result.entries.filter(entry => entry['.tag'] === 'folder');
    return { success: true, folders };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to list folder' };
  }
});

ipcMain.handle('dropbox:searchFolder', async (event, query) => {
  const token = store.get('dropboxToken');
  if (!token) throw new Error('Not connected');
  
  try {
    const dbx = getDbx(token);
    const response = await dbx.filesSearchV2({ query });
    
    const folders = [];
    if (response.result.matches) {
       for (const match of response.result.matches) {
           if (match.metadata && match.metadata.metadata && match.metadata.metadata['.tag'] === 'folder') {
               folders.push(match.metadata.metadata);
           }
       }
    }
    return { success: true, folders };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to search folders' };
  }
});

ipcMain.handle('system:selectTargetFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Dropbox Folder',
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    
    // Heuristic: Extract Dropbox path from local path
    const normalized = selectedPath.replace(/\\/g, '/');
    const dbxIndex = normalized.toLowerCase().lastIndexOf('/dropbox');
    
    let apiPath = '';
    if (dbxIndex !== -1) {
        const afterDbx = normalized.substring(dbxIndex + 8);
        const slashIndex = afterDbx.indexOf('/');
        if (slashIndex !== -1) {
             apiPath = afterDbx.substring(slashIndex);
        } else {
             apiPath = '/';
        }
    } else {
        return { success: false, error: 'The selected folder does not appear to be inside a Dropbox directory.' };
    }
    
    return { success: true, apiPath: apiPath, localPath: selectedPath };
  }
  return { canceled: true };
});

function sortNumberedImages(entries) {
  const images = [];
  const pattern = /^(\d+)\.(jpg|jpeg|png|webp)$/i;
  
  for (const entry of entries) {
    if (entry['.tag'] === 'file') {
      const match = entry.name.match(pattern);
      if (match) {
        images.push({
          num: parseInt(match[1], 10),
          entry: entry
        });
      }
    }
  }
  
  images.sort((a, b) => a.num - b.num);
  return images.map(img => img.entry);
}

async function getSharedLink(dbx, dbxPath) {
  try {
    const sharedLinks = await dbx.sharingListSharedLinks({ path: dbxPath, direct_only: true });
    if (sharedLinks.result.links && sharedLinks.result.links.length > 0) {
      return sharedLinks.result.links[0].url;
    }
  } catch (err) {
    // ignore list error, try create
  }

  try {
    const newLink = await dbx.sharingCreateSharedLinkWithSettings({ path: dbxPath });
    return newLink.result.url;
  } catch (err) {
    const errStr = String(err).toLowerCase();
    if (errStr.includes('missing_scope') || errStr.includes('sharing.write')) {
      throw new Error('MISSING_SCOPE');
    }
    if (errStr.includes('shared_link_already_exists') || errStr.includes('already exists')) {
      try {
        const sharedLinks = await dbx.sharingListSharedLinks({ path: dbxPath, direct_only: true });
        if (sharedLinks.result.links && sharedLinks.result.links.length > 0) {
          return sharedLinks.result.links[0].url;
        }
      } catch (e) {}
    }
    console.error('Link generation error:', err);
    return null;
  }
}

ipcMain.handle('excel:generate', async (event, targetFolder) => {
  const token = store.get('dropboxToken');
  if (!token) throw new Error('Not connected');
  const dbx = getDbx(token);
  
  try {
    event.sender.send('progress:update', { stage: 'scanning_skus', message: 'Scanning SKU folders...' });
    
    // Get immediate child folders (SKUs)
    const folderResp = await dbx.filesListFolder({ path: targetFolder === '/' ? '' : targetFolder });
    const skus = folderResp.result.entries.filter(e => e['.tag'] === 'folder');
    
    if (skus.length === 0) {
      return { success: false, error: 'No SKU folders found in the selected folder.' };
    }
    
    const catalogData = [];
    let totalImages = 0;
    let imagesProcessed = 0;
    
    event.sender.send('progress:update', { stage: 'scanning_images', message: 'Finding images in SKUs...', totalSkus: skus.length });

    // First pass: discover images to get a total count
    for (let i = 0; i < skus.length; i++) {
      const skuFolder = skus[i];
      event.sender.send('progress:update', { stage: 'scanning_images', currentSku: skuFolder.name, skuIndex: i, totalSkus: skus.length });
      
      const contents = await dbx.filesListFolder({ path: skuFolder.path_lower });
      const images = sortNumberedImages(contents.result.entries);
      
      totalImages += images.length;
      catalogData.push({
        sku: skuFolder.name,
        images: images,
        links: []
      });
    }

    event.sender.send('progress:update', { stage: 'generating_links', message: 'Generating Dropbox Links...', totalImages, imagesProcessed: 0 });

    let linksCreated = 0;

    // Second pass: generate links
    for (const row of catalogData) {
      for (const img of row.images) {
        try {
          const url = await getSharedLink(dbx, img.path_lower);
          row.links.push(url || '[Error generating link]');
          linksCreated++;
        } catch (error) {
          if (error.message === 'MISSING_SCOPE') {
             return { success: false, error: 'Missing Dropbox sharing permission.\nYour Dropbox app needs the "sharing.write" permission.' };
          }
          row.links.push('[Error]');
        }
        imagesProcessed++;
        
        event.sender.send('progress:update', { 
          stage: 'generating_links', 
          totalImages, 
          imagesProcessed,
          linksCreated,
          currentSku: row.sku
        });
      }
    }

    // Prepare Excel preview data
    let maxImages = 0;
    const previewData = [];
    
    catalogData.forEach(row => {
      if (row.links.length > maxImages) maxImages = row.links.length;
      const previewRow = { SKU: row.sku };
      row.links.forEach((link, idx) => {
        previewRow[`Image ${idx + 1}`] = link;
      });
      previewData.push(previewRow);
    });

    return { 
      success: true, 
      data: previewData, 
      maxImages, 
      summary: { 
        skus: skus.length, 
        totalImages, 
        linksCreated,
        skusWithoutImages: catalogData.filter(r => r.images.length === 0).length
      } 
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('excel:selectDownloadFolder', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Excel Download Path',
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    store.set('downloadPath', selectedPath);
    return { success: true, path: selectedPath };
  }
  return { canceled: true };
});

ipcMain.handle('excel:getDownloadFolder', async () => {
  return store.get('downloadPath') || null;
});

ipcMain.handle('excel:save', async (event, { data, maxImages, targetFolder, targetFolderName }) => {
  const manualPath = store.get('downloadPath');
  
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  
  const safeFolderName = (targetFolderName || 'Catalog').replace(/[<>:"/\\|?*]+/g, '_');
  const filename = `${safeFolderName}_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.xlsx`;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Catalog');

    const columns = [
      { header: 'SKU', key: 'SKU', width: 20 }
    ];
    for (let i = 1; i <= maxImages; i++) {
      columns.push({ header: `Image ${i}`, key: `Image ${i}`, width: 40 });
    }
    worksheet.columns = columns;

    worksheet.addRows(data);
    
    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    if (manualPath && manualPath !== '') {
      // Save locally to manually selected path
      const filePath = path.join(manualPath, filename);
      await workbook.xlsx.writeFile(filePath);
      return { success: true, filePath: filePath };
    } else {
      // Upload directly to Dropbox target folder
      const token = store.get('dropboxToken');
      if (!token) throw new Error('Not connected to Dropbox');
      const dbx = getDbx(token);
      
      const buffer = await workbook.xlsx.writeBuffer();
      const basePath = (targetFolder === '/' ? '' : targetFolder);
      const dbxPath = `${basePath}/${filename}`;
      
      await dbx.filesUpload({ 
        path: dbxPath, 
        contents: buffer, 
        mode: { '.tag': 'add' }, 
        autorename: true 
      });
      
      return { success: true, filePath: `Dropbox: ${dbxPath}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Authentication System

// Password Hashing Helper
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

ipcMain.handle('auth:register', async (event, { name, mobile, email, password }) => {
  try {
    const users = store.get('auth_users') || [];
    
    // Check duplicates (email is case-insensitive)
    const lowerEmail = email.toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === lowerEmail || u.mobile === mobile);
    if (existing) {
      if (existing.mobile === mobile) return { success: false, error: 'This mobile number is already registered.' };
      if (existing.email.toLowerCase() === lowerEmail) return { success: false, error: 'This email address is already registered.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    
    const newUser = {
      id: crypto.randomUUID(),
      name,
      mobile,
      email: lowerEmail, // store normalized email
      passwordHash,
      passwordSalt: salt,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    store.set('auth_users', users);
    
    // Auto-login after registration
    const sessionData = { userId: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile };
    store.set('auth_session', sessionData);
    
    return { success: true, user: sessionData };
  } catch (err) {
    return { success: false, error: 'Failed to create account.' };
  }
});

ipcMain.handle('auth:login', async (event, { identifier, password }) => {
  try {
    const users = store.get('auth_users') || [];
    const lowerIdentifier = identifier.toLowerCase();
    
    // Find user by email (case-insensitive) or mobile
    const user = users.find(u => u.email.toLowerCase() === lowerIdentifier || u.mobile === identifier);
    if (!user) {
      return { success: false, error: 'Invalid email/mobile or password.' }; // generic error
    }

    const computedHash = hashPassword(password, user.passwordSalt);
    
    if (computedHash === user.passwordHash) {
      const sessionData = { userId: user.id, name: user.name, email: user.email, mobile: user.mobile };
      store.set('auth_session', sessionData);
      return { success: true, user: sessionData };
    } else {
      return { success: false, error: 'Invalid email/mobile or password.' };
    }
  } catch (err) {
    return { success: false, error: 'Login failed due to system error.' };
  }
});

ipcMain.handle('auth:logout', async () => {
  store.delete('auth_session');
  return { success: true };
});

ipcMain.handle('auth:checkSession', async () => {
  const session = store.get('auth_session');
  if (session) {
    return { success: true, user: session };
  }
  return { success: false };
});
