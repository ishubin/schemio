const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const { FileIndex } = require('../../common/fs/fileIndex');
const { createArt, getAllArt, saveArt, deleteArt } = require('./art');
const { generateUserAgent, ContextHolder } = require('./context');
const { copyFileToProjectMedia, uploadDiagramPreview } = require('./media');
const { buildAppMenu } = require('./menu');
const { navigatorOpenContextMenuForFile } = require('./navigator');
const { openProject, readProjectFile, writeProjectFile, writeProjectFileInFolder, createNewDiagram, createNewFolder, renameFolder, renameDiagram, moveFile, projectFileTree, findDiagrams, getDiagram } = require('./project');
const { createStyle, getStyles, deleteStyle } = require('./styles');

buildAppMenu();

const contextHolder = new ContextHolder(data => {
    data.fileIndex = new FileIndex();
    data.fileIndex.isElectron = true;
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}
const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            nodeIntegration: true,
            contextIsolation: true,
            enableRemoteModule: true,
            webSecurity: false
        },
    });

    contextHolder.register(mainWindow.webContents.id);

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY, {userAgent: generateUserAgent(mainWindow.webContents.id)});

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    return mainWindow;
};



const mediaProtocolName = 'media';
protocol.registerSchemesAsPrivileged([{
    scheme: mediaProtocolName,
    privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        bypassCSP: true
    }
}]);

const mediaUrlPrefix = `${mediaProtocolName}://local/`;
app.whenReady().then(() => {
    protocol.registerFileProtocol(mediaProtocolName, (request, callback) => {
        let url = request.url.startsWith(mediaUrlPrefix) ? request.url.substring(mediaUrlPrefix.length) : request.url.substring(mediaProtocolName.length + 3);
        const fileIndex = contextHolder.fromRequest(request).fileIndex;
        const fullPath = path.join(fileIndex.rootPath, '.media', url );
        callback({ path: fullPath});
    });


    const mainWindow = createWindow();
    ipcMain.handle('project:open', openProject(contextHolder));
    ipcMain.handle('project:fileTree', projectFileTree(contextHolder));
    ipcMain.handle('project:readFile', readProjectFile(contextHolder));
    ipcMain.handle('project:writeFile', writeProjectFile(contextHolder));
    ipcMain.handle('project:writeFileInFolder', writeProjectFileInFolder(contextHolder));
    ipcMain.handle('project:createNewDiagram', createNewDiagram(contextHolder));
    ipcMain.handle('project:createNewFolder', createNewFolder(contextHolder));
    ipcMain.handle('project:renameFolder', renameFolder(contextHolder));
    ipcMain.handle('project:renameDiagram', renameDiagram(contextHolder));
    ipcMain.handle('navigator:contexMenuFile', navigatorOpenContextMenuForFile(contextHolder));
    ipcMain.handle('project:moveFile', moveFile(contextHolder));
    ipcMain.handle('project:findDiagrams', findDiagrams(contextHolder));
    ipcMain.handle('project:getDiagram', getDiagram(contextHolder));
    ipcMain.handle('media:copyFileToProject', copyFileToProjectMedia(contextHolder));
    ipcMain.handle('media:uploadDiagramPreview', uploadDiagramPreview(contextHolder))

    ipcMain.handle('art:create', createArt(contextHolder));
    ipcMain.handle('art:getAll', getAllArt(contextHolder));
    ipcMain.handle('art:save', saveArt(contextHolder));
    ipcMain.handle('art:delete', deleteArt(contextHolder));

    ipcMain.handle('style:create', createStyle(contextHolder));
    ipcMain.handle('style:getAll', getStyles(contextHolder));
    ipcMain.handle('style:delete', deleteStyle(contextHolder));

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });


    const retransmitToRenderer = (eventName) => {
        app.on(eventName, () => {
            mainWindow.webContents.send(eventName);
        });
    }

    [
      'history:undo',
      'history:redo',
      'edit:cut',
      'edit:copy',
      'edit:paste',
      'edit:delete',
      'edit:selectAll',
    ].forEach(retransmitToRenderer);
});
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});