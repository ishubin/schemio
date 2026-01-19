const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const { createArt, getAllArt, saveArt, deleteArt } = require('./art');
const { ContextHolder } = require('./context');
const { startElectronProjectExporter } = require('./exporter');
const { copyFileToProjectMedia, uploadDiagramPreview } = require('./media');
const { buildAppMenu, showContextMenu, saveAppMenuState, restoreAppMenuState, setRecentProjectsInMenu } = require('./menu');
const { navigatorOpenContextMenuForFile } = require('./navigator');
const { openProject, readProjectFile, createNewDiagram, createNewFolder, renameFolder, renameDiagram, moveFile, projectFileTree, findDiagrams, getDiagram, selectProject, importDiagram, selectProjectInFocusedWindow, writeProjectDiagram, getDiagramInfo } = require('./project');
const { getLastOpenProjects, forgetLastOpenProject } = require('./storage');
const { createStyle, getStyles, deleteStyle } = require('./styles');
const { createWindow } = require('./window');
const nodeUrl = require('node:url');
const { saveUserSettings, loadUserSettings } = require('./settings');

getLastOpenProjects().then(projects => {
    if (Array.isArray(projects)) {
        for (let i = projects.length - 1; i >= 0; i--) {
            app.addRecentDocument(projects[i].path);
        }
    }
});

let  defaultMenuState = null;
const allWindowsMenuStates = new Map();

const contextHolder = new ContextHolder();


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
        // corsEnabled: true,
        bypassCSP: true
    }
}]);

const mediaUrlPrefix = `${mediaProtocolName}://local/`;
const assetsUrlPrefix = `${mediaProtocolName}://assets/`;
app.whenReady().then(() => {
    buildAppMenu();
    defaultMenuState = saveAppMenuState();

    protocol.handle(mediaProtocolName, (request) => {
        let fullPath = null;
        if (request.url.startsWith(mediaUrlPrefix)) {
            const projectPath = contextHolder.fromUserAgent(request.headers.get('User-Agent')).projectPath;
            fullPath = path.join(projectPath, '.media', request.url.substring(mediaUrlPrefix.length));
        } else if (request.url.startsWith(assetsUrlPrefix)) {
            fullPath = path.join(__dirname, '..', 'renderer', 'assets', request.url.substring(assetsUrlPrefix.length));
        } else {
            fullPath = request.url.substring(mediaProtocolName.length + 3);
        }
        return net.fetch(nodeUrl.pathToFileURL(fullPath).toString());
    });

    createWindow(contextHolder);
    ipcMain.handle('app:version', () => app.getVersion());
    ipcMain.handle('project:open', openProject(contextHolder));
    ipcMain.handle('project:select', selectProject(contextHolder));
    ipcMain.handle('project:fileTree', projectFileTree(contextHolder));
    ipcMain.handle('project:readFile', readProjectFile(contextHolder));
    ipcMain.handle('project:writeDiagram', writeProjectDiagram(contextHolder));
    ipcMain.handle('project:createNewDiagram', createNewDiagram(contextHolder));
    ipcMain.handle('project:createNewFolder', createNewFolder(contextHolder));
    ipcMain.handle('project:renameFolder', renameFolder(contextHolder));
    ipcMain.handle('project:renameDiagram', renameDiagram(contextHolder));
    ipcMain.handle('navigator:contexMenuFile', navigatorOpenContextMenuForFile(contextHolder));
    ipcMain.handle('project:moveFile', moveFile(contextHolder));
    ipcMain.handle('project:findDiagrams', findDiagrams(contextHolder));
    ipcMain.handle('project:getDiagram', getDiagram(contextHolder));
    ipcMain.handle('project:getDiagramInfo', getDiagramInfo(contextHolder));
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

    ipcMain.handle('storage:getLastOpenProjects', () => getLastOpenProjects());
    ipcMain.handle('storage:forgetLastOpenProject', (projectPath) => forgetLastOpenProject(projectPath));

    ipcMain.handle('settings:save', (event, settings) => saveUserSettings(settings));
    ipcMain.handle('settings:load', (event) => loadUserSettings());

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

    app.on('open-file', selectProjectInFocusedWindow(contextHolder));

    app.on('file:selectRecentProject', (event, projectPath) => {
        selectProject(contextHolder)(event, projectPath);
    });

    app.on('file:newWindow', () => {
        createWindow(contextHolder);
    });

    app.on('file:importDiagram', importDiagram);

    app.on('browser-window-blur', (event, win) => {
        const menuState = saveAppMenuState();
        allWindowsMenuStates.set(win.webContents.id, menuState);
    });

    app.on('browser-window-focus', (event, win) => {
        const menuState = allWindowsMenuStates.get(win.webContents.id);
        if (menuState) {
            restoreAppMenuState(menuState);
        } else {
            restoreAppMenuState(defaultMenuState);
        }
    });

    const retransmitToRenderer = (eventName) => {
        app.on(eventName, () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (!focusedWindow) {
                return;
            }
            focusedWindow.webContents.send(eventName);
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
      'edit:settings',
      'view:zoomIn',
      'view:zoomOut',
      'view:resetZoom',
      'file:exportAsJSON',
      'file:exportAsPNG',
      'file:exportAsSVG',
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