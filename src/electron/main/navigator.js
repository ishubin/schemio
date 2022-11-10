import { FileIndex } from '../../common/fs/fileIndex';

const { BrowserWindow, Menu } = require('electron');

/**
 *
 * @param {FileIndex} fileIndex
 * @returns
 */
export function navigatorOpenContextMenuForFile(fileIndex) {
    return (event, file) => {
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
                label: 'Delete',
                click: () => {
                    if (file.kind === 'schemio-doc') {
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