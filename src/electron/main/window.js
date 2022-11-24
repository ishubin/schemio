const { BrowserWindow, shell, Menu } = require('electron');
const { generateUserAgent, ContextHolder } = require('./context');
const URL = require('url');


/**
 *
 * @param {ContextHolder} contextHolder
 */
export function createWindow(contextHolder) {
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

    mainWindow.maximize();

    contextHolder.register(mainWindow.webContents.id);

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY, {userAgent: generateUserAgent(mainWindow.webContents.id)});

    mainWindow.webContents.on('will-navigate', (e, urlString) => {
        e.preventDefault();

        const url = URL.parse(urlString);
        if (url.hostname === 'localhost') {
            urlString = url.path;
        }

        const docsPrefix = '/docs/';
        if (urlString.startsWith(docsPrefix)) {
            const docId = urlString.substring(docsPrefix.length);
            const fsPath  = contextHolder.fromWindow(mainWindow).projectService.getDiagramPath(docId);
            if (fsPath) {
                mainWindow.webContents.send('navigator:open', fsPath);
            }
            return;
        }

        if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== 'localhost') {
            shell.openExternal(urlString);
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });



    const selectionMenu = Menu.buildFromTemplate([
        {role: 'copy'},
        {type: 'separator'},
        {role: 'selectall'},
    ]);

    const inputMenu = Menu.buildFromTemplate([
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        {type: 'separator'},
        {role: 'selectall'},
    ]);

    mainWindow.webContents.on('context-menu', (e, props) => {
        const { selectionText, isEditable } = props;
        if (isEditable) {
            inputMenu.popup(mainWindow);
        } else if (selectionText && selectionText.trim() !== '') {
            selectionMenu.popup(mainWindow);
        }
    });



    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    return mainWindow;
};
