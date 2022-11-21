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
            { label: 'Open Project...'},
            menuItem('file-exportStatic', 'Export project...', false, 'file:exportStatic', null),
            { label: 'Import diagram...'},
            { label: 'Export diagram as JSON..'},
            { label: 'Export diagram as HTML..'},
            { label: 'Export diagram as PNG..'},
            { label: 'Export diagram as SVG..'},
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
            menuItem('edit-cut', 'Cut', true, 'edit:cut', null),
            menuItem('edit-copy', 'Copy', true, 'edit:copy', null),
            menuItem('edit-paste', 'Paste', true, 'edit:paste', null),
            menuItem('edit-delete', 'Delete', true, 'edit:delete', null),
            menuItem('edit-selectAll', 'Select all', true, 'edit:selectAll', null),
        ]
    },
    // { role: 'viewMenu' }
    {
        label: 'View',
        submenu: [
            menuItem('view-zoomIn', 'Zoom In', true, 'view:zoomIn', '='),
            menuItem('view-zoomOut', 'Zoom Out', true, 'view:zoomOut', '-'),
            menuItem('view-resetZoom', 'Reset Zoom', true, 'view:resetZoom', 'CmdOrCtrl+0'),
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