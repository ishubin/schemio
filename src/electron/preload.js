const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openProject       : () => ipcRenderer.invoke('project:open'),
    getProjectFileTree: () =>  ipcRenderer.invoke('project:fileTree'),
    readFile          : (filePath) => ipcRenderer.invoke('project:readFile', filePath),
    writeFile         : (filePath, content) => ipcRenderer.invoke('project:writeFile', filePath, content),
    writeFileInFolder : (folderPath, fileName, content) => ipcRenderer.invoke('project:writeFile', folderPath, fileName, content),
    createNewDiagram  : (folderPath, diagram) => ipcRenderer.invoke('project:createNewDiagram', folderPath, diagram),
    createNewFolder   : (parentPath, name) => ipcRenderer.invoke('project:createNewFolder', parentPath, name),
    renameFolder      : (folderPath, newFolderName) => ipcRenderer.invoke('project:renameFolder', folderPath, newFolderName),
    renameDiagram     : (filePath, newName) => ipcRenderer.invoke('project:renameDiagram', filePath, newName),
    moveFile          : (filePath, newParentPath) => ipcRenderer.invoke('project:moveFile', filePath, newParentPath),


    navigatorOpenContextMenuFile: (file) => ipcRenderer.invoke('navigator:contexMenuFile', file),

    copyFileToProjectMedia: (filePath, fileName) => ipcRenderer.invoke('media:copyFileToProject', filePath, fileName),
    uploadDiagramPreview  : (docId, preview) => ipcRenderer.invoke('media:uploadDiagramPreview', docId, preview),

    $on: (channel, callback) =>  ipcRenderer.on(channel, callback),
    $off: (channel, callback) =>  ipcRenderer.off(channel, callback),
});