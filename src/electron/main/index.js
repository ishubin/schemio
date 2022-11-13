const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const { FileIndex } = require('../../common/fs/fileIndex');
const { generateUserAgent, ContextHolder } = require('./context');
const { navigatorOpenContextMenuForFile } = require('./navigator');
const { openProject, readProjectFile, writeProjectFile, writeProjectFileInFolder, createNewDiagram, createNewFolder, renameFolder, renameDiagram, moveFile, projectFileTree } = require('./project');

const contextHolder = new ContextHolder(data => {
    data.fileIndex = new FileIndex();
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
};



const projectProtocolName = 'project';
protocol.registerSchemesAsPrivileged([{
    scheme: projectProtocolName,
    privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        bypassCSP: true
    }
}]);

app.whenReady().then(() => {
    protocol.registerFileProtocol(projectProtocolName, (request, callback) => {
        const url = request.url.substring(projectProtocolName.length + 3);
        callback({ path: url });
    });
    createWindow();
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

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});