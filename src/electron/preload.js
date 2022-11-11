const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openProject: () => ipcRenderer.invoke('project:open'),
    readFile: (projectPath, filePath) => ipcRenderer.invoke('project:readFile', projectPath, filePath),
    writeFile: (projectPath, filePath, content) => ipcRenderer.invoke('project:writeFile', projectPath, filePath, content),
    writeFileInFolder: (projectPath, folderPath, fileName, content) => ipcRenderer.invoke('project:writeFile', projectPath, folderPath, fileName, content),
    createNewDiagram: (projectPath, folderPath, diagram) => ipcRenderer.invoke('project:createNewDiagram', projectPath, folderPath, diagram),
    createNewFolder: (projectPath, parentPath, name) => ipcRenderer.invoke('project:createNewFolder', projectPath, parentPath, name),
    renameFolder: (projectPath, folderPath, newFolderName) => ipcRenderer.invoke('project:renameFolder', projectPath, folderPath, newFolderName),
    renameDiagram: (projectPath, filePath, newName) => ipcRenderer.invoke('project:renameDiagram', projectPath, filePath, newName),

    navigatorOpenContextMenuFile: (file) => ipcRenderer.invoke('navigator:contexMenuFile', file),

    $on: (channel, callback) =>  ipcRenderer.on(channel, callback),
    $off: (channel, callback) =>  ipcRenderer.off(channel, callback),
});