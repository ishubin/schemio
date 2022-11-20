const { BrowserWindow, shell } = require('electron');
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

        const prefixes = ['project://diagram/', '/docs/'];
        for (let i = 0; i < prefixes.length; i++) {
            const prefix = prefixes[i];
            if (urlString.startsWith(prefix)) {
                const docId = urlString.substring(prefix.length);
                const doc  = contextHolder.fromWindow(mainWindow).fileIndex.getDocumentFromIndex(docId);
                if (doc) {
                    mainWindow.webContents.send('navigator:open', doc.fsPath);
                }
                return;
            }
        }

        if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== 'localhost') {
            shell.openExternal(urlString);
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    return mainWindow;
};
