const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openProject: () => ipcRenderer.invoke('project:open'),
    scanProject: (projectPath) => ipcRenderer.invoke('project:scan', projectPath),
    readFile: (projectPath, filePath) => ipcRenderer.invoke('project:readFile', projectPath, filePath),
    writeFile: (projectPath, filePath, content) => ipcRenderer.invoke('project:writeFile', projectPath, filePath, content)
});