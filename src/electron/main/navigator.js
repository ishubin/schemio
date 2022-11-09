const { BrowserWindow, Menu } = require('electron');

export function navigatorOpenContextMenuForFile(event, file) {
    let template = [];

    if (file) {
        if (file.kind === 'dir') {
            template.push({
                label: 'New diagram...',
                click: () => {event.sender.send('navigator:new-diagram-requested', file.path)}
            });
            template.push({
                label: 'New folder...',
                click: () => {event.sender.send('navigator:new-folder-requested', file.path)}
            });
        }
        if (file.kind === 'schemio-doc') {
            template.push({
                label: 'Open'
            });
        }

        template = template.concat([{
            type: 'separator'
        }, {
            label: 'Rename'
        }, {
            label: 'Delete'
        }]);
    } else {
        template.push({
            label: 'New diagram...',
            click: () => {event.sender.send('navigator:new-diagram-requested', null)}
        });
        template.push({
            label: 'New folder...',
            click: () => {event.sender.send('navigator:new-folder-requested', null)}
        });
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
}