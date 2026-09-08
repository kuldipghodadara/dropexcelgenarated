const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Token Management
  getTokenStatus: () => ipcRenderer.invoke('dropbox:getTokenStatus'),
  setToken: (token) => ipcRenderer.invoke('dropbox:setToken', token),
  removeToken: () => ipcRenderer.invoke('dropbox:removeToken'),

  // Folder Navigation
  listFolder: (path) => ipcRenderer.invoke('dropbox:listFolder', path),
  searchFolder: (query) => ipcRenderer.invoke('dropbox:searchFolder', query),
  selectTargetFolder: () => ipcRenderer.invoke('system:selectTargetFolder'),

  // Execution
  generateExcel: (targetFolder) => ipcRenderer.invoke('excel:generate', targetFolder),
  saveExcel: (data) => ipcRenderer.invoke('excel:save', data),
  selectDownloadFolder: () => ipcRenderer.invoke('excel:selectDownloadFolder'),
  getDownloadFolder: () => ipcRenderer.invoke('excel:getDownloadFolder'),

  // Events
  onProgressUpdate: (callback) => ipcRenderer.on('progress:update', (event, data) => callback(data)),
  removeProgressUpdate: () => ipcRenderer.removeAllListeners('progress:update'),

  // Authentication
  register: (data) => ipcRenderer.invoke('auth:register', data),
  login: (data) => ipcRenderer.invoke('auth:login', data),
  logout: () => ipcRenderer.invoke('auth:logout'),
  checkSession: () => ipcRenderer.invoke('auth:checkSession')
});
