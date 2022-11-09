const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openProject: () => ipcRenderer.invoke('project:open'),
    scanProject: (projectPath) => ipcRenderer.invoke('project:scan', projectPath),
    readFile: (projectPath, filePath) => ipcRenderer.invoke('project:readFile', projectPath, filePath),
    writeFile: (projectPath, filePath, content) => ipcRenderer.invoke('project:writeFile', projectPath, filePath, content),
    writeFileInFolder: (projectPath, folderPath, fileName, content) => ipcRenderer.invoke('project:writeFile', projectPath, folderPath, fileName, content),
    createNewDiagram: (projectPath, folderPath, diagram) => ipcRenderer.invoke('project:createNewDiagram', projectPath, folderPath, diagram),

    navigatorOpenContextMenuFile: (file) => ipcRenderer.invoke('navigator:contexMenuFile', file),

    $on: (channel, callback) =>  ipcRenderer.on(channel, callback),
    $off: (channel, callback) =>  ipcRenderer.off(channel, callback),
});