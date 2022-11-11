const { app, BrowserWindow, ipcMain } = require('electron');
const { FileIndex } = require('../../common/fs/fileIndex');
const { navigatorOpenContextMenuForFile } = require('./navigator');
const { openProject, readProjectFile, writeProjectFile, writeProjectFileInFolder, createNewDiagram, createNewFolder, renameFolder, renameDiagram } = require('./project');

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
            enableRemoteModule: true
        },
    });

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
};


const fileIndex = new FileIndex();

app.whenReady().then(() => {
    createWindow();
    ipcMain.handle('project:open', openProject(fileIndex));
    ipcMain.handle('project:readFile', readProjectFile);
    ipcMain.handle('project:writeFile', writeProjectFile(fileIndex));
    ipcMain.handle('project:writeFileInFolder', writeProjectFileInFolder(fileIndex));
    ipcMain.handle('project:createNewDiagram', createNewDiagram(fileIndex));
    ipcMain.handle('project:createNewFolder', createNewFolder(fileIndex));
    ipcMain.handle('project:renameFolder', renameFolder(fileIndex));
    ipcMain.handle('project:renameDiagram', renameDiagram(fileIndex));
    ipcMain.handle('navigator:contexMenuFile', navigatorOpenContextMenuForFile(fileIndex));


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