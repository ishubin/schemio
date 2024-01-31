/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { findKey } from './collections';
import Vue from 'vue';



export const Keys = {
    ESCAPE      : 'escape',
    DELETE      : 'delete',
    CTRL        : 'ctrl',
    CMD         : 'cmd',
    SHIFT       : 'shift',
    CTRL_A      : 'ctrl-a',
    CTRL_C      : 'ctrl-c',
    CTRL_V      : 'ctrl-v',
    CTRL_S      : 'ctrl-s',
    CTRL_X      : 'ctrl-x',
    CTRL_Z      : 'ctrl-z',
    CTRL_ZERO   : 'ctrl-0',
    CTRL_SHIFT_Z: 'ctrl-shift-z',
    UP          : 'arrow-up',
    DOWN        : 'arrow-down',
    LEFT        : 'arrow-left',
    RIGHT       : 'arrow-right',
    SPACE       : 'space',
    MINUS       : 'minus',
    EQUALS      : 'equals'
};

const keyMap = {};
keyMap[Keys.ESCAPE] = event => event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27;
keyMap[Keys.DELETE] = event => event.key === 'Backspace' || event.key === 'Delete' || event.keyCode === 8 || event.keyCode === 127;
keyMap[Keys.CTRL_X] = event => event.key === 'x' && (event.metaKey || event.ctrlKey);
keyMap[Keys.CTRL_A] = event => event.key === 'a' && (event.metaKey || event.ctrlKey);
keyMap[Keys.CTRL_C] = event => event.key === 'c' && (event.metaKey || event.ctrlKey);
keyMap[Keys.CTRL_V] = event => event.key === 'v' && (event.metaKey || event.ctrlKey);
keyMap[Keys.CTRL_S] = event => event.key === 's' && (event.metaKey || event.ctrlKey);
keyMap[Keys.CTRL_Z] = event => event.key === 'z' && (event.metaKey || event.ctrlKey) && (!event.shiftKey);
keyMap[Keys.CTRL_ZERO] = event => event.keyCode === 48 && (event.metaKey || event.ctrlKey) && !event.shiftKey;
keyMap[Keys.CTRL_SHIFT_Z] = event => event.key === 'z' && (event.metaKey || event.ctrlKey) && event.shiftKey;
keyMap[Keys.LEFT] = event => event.key === 'ArrowLeft';
keyMap[Keys.RIGHT] = event => event.key === 'ArrowRight';
keyMap[Keys.UP] = event => event.key === 'ArrowUp';
keyMap[Keys.DOWN] = event => event.key === 'ArrowDown';
keyMap[Keys.SPACE] = event => event.key === ' ' || event.keyCode === 32;
keyMap[Keys.MINUS] = event => event.key === '-' || event.keyCode === 189;
keyMap[Keys.EQUALS] = event => event.key === '=' || event.keyCode === 187;
keyMap[Keys.CTRL] = event => event.key === 'Control';
keyMap[Keys.CMD] = event => event.key === 'Meta';
keyMap[Keys.SHIFT] = event => event.key === 'Shift';
/**
 *
 * @param {MouseEvent} event
 * @returns {String} id of event which is available in Keys object
 */
export function identifyKeyPress(event) {
    return findKey(keyMap, check => check(event));
}

const keyEventBus = new Vue({});

export function registerKeyPressHandler(callback) {
    keyEventBus.$on('key-press', callback);
}

export function deregisterKeyPressHandler(callback) {
    keyEventBus.$off('key-press', callback);
}

let lastKeyPressed = null;

function handleKeyPress(event, isDown) {
    if (!isDown) {
        lastKeyPressed = null;
    }
    event = event || window.event;
    if (event.target !== document.body) {
        return;
    }
    const key = identifyKeyPress(event);
    if (key) {
        if (isDown) {
            // only arrow keys should be allowed to continuously invoke key press event
            if (lastKeyPressed === key && !key.startsWith('arrow-')) {
                return;
            }
            lastKeyPressed = key;
        }

        keyEventBus.$emit('key-press', isDown, key, {
            ctrlCmdPressed: event.metaKey || event.ctrlKey
        }, event);
    }
}

export function simulateKeyPress(key, isControlPressed) {
    if (document.activeElement === document.body) {
        keyEventBus.$emit('key-press', true, key, {
            ctrlCmdPressed: isControlPressed
        });
    }
}

document.addEventListener('keydown', (event) => handleKeyPress(event, true));
document.addEventListener('keyup', (event) => handleKeyPress(event, false));