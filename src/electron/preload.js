const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openProject       : () => ipcRenderer.invoke('project:open'),
    selectProject     : (projectPath) => ipcRenderer.invoke('project:select', projectPath),
    getProjectFileTree: () =>  ipcRenderer.invoke('project:fileTree'),
    readFile          : (filePath) => ipcRenderer.invoke('project:readFile', filePath),
    writeFile         : (filePath, content) => ipcRenderer.invoke('project:writeFile', filePath, content),
    writeFileInFolder : (folderPath, fileName, content) => ipcRenderer.invoke('project:writeFile', folderPath, fileName, content),
    createNewDiagram  : (folderPath, diagram) => ipcRenderer.invoke('project:createNewDiagram', folderPath, diagram),
    createNewFolder   : (parentPath, name) => ipcRenderer.invoke('project:createNewFolder', parentPath, name),
    renameFolder      : (folderPath, newFolderName) => ipcRenderer.invoke('project:renameFolder', folderPath, newFolderName),
    renameDiagram     : (filePath, newName) => ipcRenderer.invoke('project:renameDiagram', filePath, newName),
    moveFile          : (filePath, newParentPath) => ipcRenderer.invoke('project:moveFile', filePath, newParentPath),
    findDiagrams      : (query, page) => ipcRenderer.invoke('project:findDiagrams', query, page),
    getDiagram        : (docId) => ipcRenderer.invoke('project:getDiagram', docId),


    createArt: (name, url) => ipcRenderer.invoke('art:create', name, url),
    getAllArt: () => ipcRenderer.invoke('art:getAll'),
    saveArt  : (artId, name, url) => ipcRenderer.invoke('art:save', artId, name, url),
    deleteArt: (artId) => ipcRenderer.invoke('art:delete', artId),


    createStyle: (fill, strokeColor, textColor) => ipcRenderer.invoke('style:create', fill, strokeColor, textColor),
    deleteStyle: (styleId) => ipcRenderer.invoke('style:delete', styleId),
    getStyles: () => ipcRenderer.invoke('style:getAll'),

    navigatorOpenContextMenuFile: (file) => ipcRenderer.invoke('navigator:contexMenuFile', file),

    copyFileToProjectMedia: (filePath, fileName) => ipcRenderer.invoke('media:copyFileToProject', filePath, fileName),
    uploadDiagramPreview  : (docId, preview) => ipcRenderer.invoke('media:uploadDiagramPreview', docId, preview),


    menu: {
        updateHistoryState: (undoable, redoable) => ipcRenderer.invoke('menu:update-history-state', undoable, redoable),
        enableMenuItem: (menuItemId) => ipcRenderer.invoke('menu:enable-item', menuItemId),
        disableMenuItem: (menuItemId) => ipcRenderer.invoke('menu:disable-item', menuItemId),

        openContextMenu: (menuId, menuOptions) => ipcRenderer.invoke('menu:showContextMenu', menuId, menuOptions),
    },

    storage: {
        getLastOpenProjects: () => ipcRenderer.invoke('storage:getLastOpenProjects'),
    },

    $on: (channel, callback) =>  ipcRenderer.on(channel, callback),
    $off: (channel, callback) =>  ipcRenderer.off(channel, callback),
});