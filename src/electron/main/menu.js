const { app, Menu, ipcMain, BrowserWindow } = require('electron');


function updateHistoryState(event, undoable, redoable) {
    Menu.getApplicationMenu().getMenuItemById('edit-undo').enabled = undoable;
    Menu.getApplicationMenu().getMenuItemById('edit-redo').enabled = redoable;
}

function enableMenuItem(event, menuItemId) {
    Menu.getApplicationMenu().getMenuItemById(menuItemId).enabled = true;
}

function disableMenuItem(event, menuItemId) {
    Menu.getApplicationMenu().getMenuItemById(menuItemId).enabled = false;
}

function menuItem(id, label, enabled, eventName, accelerator) {
    return {
        id, label, enabled, accelerator,
        click(menuItem, browserWindow) {
            app.emit(eventName, browserWindow);
        }
    };
}

/**
 *
 * @returns {Menu}
 */
export function buildAppMenu() {
    const isMac = process.platform === 'darwin'

    const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
        label: app.name,
        submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
        ]
    }] : []),
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [
            menuItem('file-newWindow', 'New window', true, 'file:newWindow', null),
            menuItem('file-openProject', 'Open project...', true, 'file:openProject', null),
            {
                "label":"Open Recent",
                "role":"recentdocuments",
                "submenu":[
                  {
                    "label":"Clear Recent",
                    "role":"clearrecentdocuments"
                  }
                ]
            },
            { type: 'separator' },
            menuItem('file-exportStatic', 'Export project...', false, 'file:exportStatic', null),
            { type: 'separator' },
            menuItem('file-importDiagram', 'Import diagram...', false, 'file:importDiagram', null),
            menuItem('file-exportAsJSON', 'Export diagram as JSON...', false, 'file:exportAsJSON', null),
            menuItem('file-exportAsPNG', 'Export diagram as PNG...', false, 'file:exportAsPNG', null),
            menuItem('file-exportAsSVG', 'Export diagram as SVG...', false, 'file:exportAsSVG', null),
            isMac ? { role: 'close' } : { role: 'quit' },
            ]
    },
    // { role: 'editMenu' }
    {
        label: 'Edit',
        submenu: [
            menuItem('edit-undo', 'Undo', false, 'history:undo', null),
            menuItem('edit-redo', 'Redo', false, 'history:redo', null),
            { type: 'separator' },
            menuItem('edit-cut', 'Cut', false, 'edit:cut', null),
            menuItem('edit-copy', 'Copy', false, 'edit:copy', null),
            menuItem('edit-paste', 'Paste', false, 'edit:paste', null),
            menuItem('edit-delete', 'Delete', false, 'edit:delete', null),
            menuItem('edit-selectAll', 'Select all', false, 'edit:selectAll', null),
            menuItem('edit-settings', 'Settings...', true, 'edit:settings', null),
        ]
    },
    // { role: 'viewMenu' }
    {
        label: 'View',
        submenu: [
            menuItem('view-zoomIn', 'Zoom In', false, 'view:zoomIn', '='),
            menuItem('view-zoomOut', 'Zoom Out', false, 'view:zoomOut', '-'),
            menuItem('view-resetZoom', 'Reset Zoom', false, 'view:resetZoom', 'CmdOrCtrl+0'),
        ]
    },
    // { role: 'windowMenu' }
    {
        label: 'Window',
        submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
        ] : [
            { role: 'close' }
        ])
        ]
    },
    {
        role: 'help',
        submenu: [
        {
            label: 'Learn More',
            click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/ishubin/schemio')
            }
        }
        ]
    }
    ]

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    ipcMain.handle('menu:update-history-state', updateHistoryState);

    ipcMain.handle('menu:enable-item', enableMenuItem);
    ipcMain.handle('menu:disable-item', disableMenuItem);

    ipcMain.handle('menu:events:editorOpened', onEditorOpened);
    ipcMain.handle('menu:events:noEditorDisplayed', onNoEditorDisplayed);
    ipcMain.handle('menu:events:itemsSelected', onItemsSelected);
    ipcMain.handle('menu:events:allItemsDeselected', onAllItemsDeselected);
    return menu;
}

function onEditorOpened(event) {
    enableMenuItem(event, 'edit-paste');
    enableMenuItem(event, 'edit-selectAll');
    enableMenuItem(event, 'view-zoomIn');
    enableMenuItem(event, 'view-zoomOut');
    enableMenuItem(event, 'view-resetZoom');
    enableMenuItem(event, 'file-importDiagram');
    enableMenuItem(event, 'file-exportAsJSON');
    enableMenuItem(event, 'file-exportAsPNG');
    enableMenuItem(event, 'file-exportAsSVG');
}
function onNoEditorDisplayed(event) {
    disableMenuItem(event, 'edit-copy');
    disableMenuItem(event, 'edit-cut');
    disableMenuItem(event, 'edit-paste');
    disableMenuItem(event, 'edit-delete');
    disableMenuItem(event, 'edit-selectAll');
    disableMenuItem(event, 'view-zoomIn');
    disableMenuItem(event, 'view-zoomOut');
    disableMenuItem(event, 'view-resetZoom');
    disableMenuItem(event, 'file-importDiagram');
    disableMenuItem(event, 'file-exportAsJSON');
    disableMenuItem(event, 'file-exportAsPNG');
    disableMenuItem(event, 'file-exportAsSVG');
}
function onItemsSelected(event) {
    enableMenuItem(event, 'edit-copy');
    enableMenuItem(event, 'edit-cut');
    enableMenuItem(event, 'edit-delete');
}
function onAllItemsDeselected(event) {
    disableMenuItem(event, 'edit-copy');
    disableMenuItem(event, 'edit-cut');
    disableMenuItem(event, 'edit-delete');
}

function convertContextMenuOptions(event, menuId, options) {
    return options.map(option => {
        const electronOption = {
            label: option.label,
        };
        if (option.submenu) {
            electronOption.submenu = convertContextMenuOptions(event, menuId, option.submenu);
        } else {
            electronOption.click = () => {
                event.sender.send('menu:contextMenuOptionSelected', menuId, option.label);
            };
        }
        return electronOption;
    });
}


export function showContextMenu(event, menuId, menuOptions) {
    const menu = Menu.buildFromTemplate(convertContextMenuOptions(event, menuId, menuOptions));
    menu.popup(BrowserWindow.fromWebContents(event.sender));
}


function traverseMenuItems(items, callback) {
    items.forEach(item => {
        callback(item);
        if (item.submenu && item.submenu.items) {
            traverseMenuItems(item.submenu.items, callback);
        }
    });
}

/**
 *
 * @returns {Map<string, boolean>}
 */
export function saveAppMenuState() {
    const menu = Menu.getApplicationMenu();
    const menuState = new Map();

    traverseMenuItems(menu.items, menuItem => {
        if (menuItem.id) {
            menuState.set(menuItem.id, menuItem.enabled);
        }
    });

    return menuState;
}

/**
 *
 * @param {Map<string, boolean>} menuState
 */
export function restoreAppMenuState(menuState) {
    const menu = Menu.getApplicationMenu();
    menuState.forEach((enabled, itemId) => {
        const menuItem = menu.getMenuItemById(itemId);
        if (menuItem) {
            menuItem.enabled = enabled;
        }
    });
}