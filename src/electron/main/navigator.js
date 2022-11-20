import { ContextHolder } from './context';

const { BrowserWindow, Menu } = require('electron');


/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function navigatorOpenContextMenuForFile(contextHolder) {
    return (event, file) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        let template = [];

        if (file) {
            if (file.kind === 'dir') {
                template.push({
                    label: 'New diagram...',
                    click: () => event.sender.send('navigator:new-diagram-requested', file.path)
                });
                template.push({
                    label: 'New folder...',
                    click: () => event.sender.send('navigator:new-folder-requested', file.path)
                });
            }
            if (file.kind === 'schemio:doc') {
                template.push({
                    label: 'Open',
                    click: () => event.sender.send('navigator:open', file.path)
                });
            }

            template = template.concat([{
                type: 'separator'
            }, {
                label: 'Rename',
                click: () => event.sender.send('navigator:rename', file.path)
            }, {
                label: 'Delete',
                click: () => {
                    if (file.kind === 'schemio:doc') {
                        fileIndex.deleteFile(file.path)
                        .then(() => {
                            event.sender.send('navigator:entry-deleted', file.path);
                        });
                    } else if (file.kind === 'dir') {
                        fileIndex.deleteFolder(file.path)
                        .then(() => {
                            event.sender.send('navigator:entry-deleted', file.path);
                        });
                    }
                }
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
    };
}