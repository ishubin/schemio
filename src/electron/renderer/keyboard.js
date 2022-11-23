/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/*
This script is used only because of the weird behavior of keyboard shortcuts for input elements in Electron.
Since we use Ctrl+X, Ctrl+C, Ctrl+V shortcuts for items modifications in diagrams, we cannot rely on Electron menu item role.
Unfortunatelly, if you want regular keyboard shortcuts to work with input or contentEditable elements, you have to declare
menu items with proper roles. But in that case it conflicts with diagram keyboard shortcuts.
*/

function handleKeyDown(event) {
    const tagName = event.target.tagName.toLowerCase();

    if (event.target.isContentEditable == true || tagName === 'input' || tagName === 'textarea') {
        // Using deprecated document.execCommand as it is a bit more tricky to implement
        // all these text handlers for contenteditable elements
        // Since this works in Electron we can have it running for regular input and textarea elements as well
        if (event.key === 'x' && (event.metaKey || event.ctrlKey)) {
            document.execCommand('cut', false);
        } else if (event.key === 'c' && (event.metaKey || event.ctrlKey)) {
            document.execCommand('copy', false);
        } else if (event.key === 'v' && (event.metaKey || event.ctrlKey)) {
            document.execCommand('paste', false);
        } else if (event.key === 'a' && (event.metaKey || event.ctrlKey)) {
            document.execCommand('selectAll', false);
        }
        return;
    }
}

export function registerElectronKeyEvents() {
    document.addEventListener('keydown', handleKeyDown);
}
