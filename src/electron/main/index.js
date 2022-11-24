const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const { createArt, getAllArt, saveArt, deleteArt } = require('./art');
const { ContextHolder } = require('./context');
const { startElectronProjectExporter } = require('./exporter');
const { copyFileToProjectMedia, uploadDiagramPreview } = require('./media');
const { buildAppMenu, showContextMenu } = require('./menu');
const { navigatorOpenContextMenuForFile } = require('./navigator');
const { openProject, readProjectFile, writeProjectFile, writeProjectFileInFolder, createNewDiagram, createNewFolder, renameFolder, renameDiagram, moveFile, projectFileTree, findDiagrams, getDiagram, selectProject } = require('./project');
const { getLastOpenProjects } = require('./storage');
const { createStyle, getStyles, deleteStyle } = require('./styles');
const { createWindow } = require('./window');

buildAppMenu();


const contextHolder = new ContextHolder(data => {
    data.projectService = null;
    data.projectPath = null;
});


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}


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
        const projectPath = contextHolder.fromRequest(request).projectPath;
        const fullPath = path.join(projectPath, '.media', url );
        callback({ path: fullPath});
    });


    const mainWindow = createWindow(contextHolder);
    ipcMain.handle('project:open', openProject(contextHolder));
    ipcMain.handle('project:select', selectProject(contextHolder));
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

    ipcMain.handle('menu:showContextMenu', showContextMenu);

    ipcMain.handle('storage:getLastOpenProjects', getLastOpenProjects);

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow(contextHolder);
        }
    });


    app.on('file:exportStatic', (browserWindow) => {
        const contextData = contextHolder.fromWindow(browserWindow);
        if (contextData) {
            startElectronProjectExporter(contextData, browserWindow);
        }
    });

    app.on('file:newWindow', () => {
        createWindow(contextHolder);
    });


    const retransmitToRenderer = (eventName) => {
        app.on(eventName, () => {
            mainWindow.webContents.send(eventName);
        });
    }

    [
      'file:openProject',
      'history:undo',
      'history:redo',
      'edit:cut',
      'edit:copy',
      'edit:paste',
      'edit:delete',
      'edit:selectAll',
      'view:zoomIn',
      'view:zoomOut',
      'view:resetZoom',
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