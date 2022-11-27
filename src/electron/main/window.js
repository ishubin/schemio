const { BrowserWindow, shell, Menu } = require('electron');
const { generateUserAgent, ContextHolder } = require('./context');
const URL = require('url');

const devToolsEnabled = process.env.SCHEMIO_DEVTOOLS === 'true';
/**
 *
 * @param {ContextHolder} contextHolder
 */
export function createWindow(contextHolder) {
    // Create the browser window.
    const window = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            nodeIntegration: true,
            contextIsolation: true,
            enableRemoteModule: true,
            webSecurity: false,
            devTools: devToolsEnabled
        },
    });


    const webContentsId = window.webContents.id;
    window.maximize();

    contextHolder.register(webContentsId, window);

    // and load the index.html of the app.
    window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY, {userAgent: generateUserAgent(window.webContents.id)});

    window.on('closed', (event) => {
        contextHolder.remove(webContentsId);
    });

    window.webContents.on('will-navigate', (e, urlString) => {
        e.preventDefault();

        const url = URL.parse(urlString);
        if (url.hostname === 'localhost') {
            urlString = url.path;
        }

        const docsPrefix = '/docs/';
        if (urlString.startsWith(docsPrefix)) {
            const docId = urlString.substring(docsPrefix.length);
            const fsPath  = contextHolder.fromWindow(window).projectService.getDiagramPath(docId);
            if (fsPath) {
                window.webContents.send('navigator:open', fsPath);
            }
            return;
        }

        if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== 'localhost') {
            shell.openExternal(urlString);
        }
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
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

    window.webContents.on('context-menu', (e, props) => {
        const { selectionText, isEditable } = props;
        if (isEditable) {
            inputMenu.popup(window);
        } else if (selectionText && selectionText.trim() !== '') {
            selectionMenu.popup(window);
        }
    });

    if (devToolsEnabled) {
        window.webContents.openDevTools();
    }
    return window;
};
