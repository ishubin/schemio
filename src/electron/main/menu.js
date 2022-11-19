const { app, Menu, ipcMain } = require('electron');


function updateHistoryState(event, undoable, redoable) {
    Menu.getApplicationMenu().getMenuItemById('edit-undo').enabled = undoable;
    Menu.getApplicationMenu().getMenuItemById('edit-redo').enabled = redoable;
}

function menuItem(id, label, enabled, eventName, accelerator) {
    return {
        id, label, enabled, accelerator,
        click() {
            app.emit(eventName);
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
        { label: 'Export project...'},
        isMac ? { role: 'close' } : { role: 'quit' },
        ]
    },
    // { role: 'editMenu' }
    {
        label: 'Edit',
        submenu: [
            menuItem('edit-undo', 'Undo', false, 'history:undo', 'CmdOrCtrl+Z'),
            menuItem('edit-redo', 'Redo', false, 'history:redo', 'Shift+CmdOrCtrl+Z'),
            { type: 'separator' },
            menuItem('edit-cut', 'Cut', true, 'edit:cut', 'CmdOrCtrl+X'),
            menuItem('edit-copy', 'Copy', true, 'edit:copy', 'CmdOrCtrl+C'),
            menuItem('edit-paste', 'Paste', true, 'edit:paste', 'CmdOrCtrl+V'),
            menuItem('edit-delete', 'Delete', true, 'edit:delete', 'Del'),
            menuItem('edit-selectAll', 'Select all', true, 'edit:selectAll', 'CmdOrCtrl+A'),
        ]
    },
    // { role: 'viewMenu' }
    {
        label: 'View',
        submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
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
}