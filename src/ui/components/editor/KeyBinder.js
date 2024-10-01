import shortid from "shortid";
import UserEventBus from "../../userevents/UserEventBus";
import { KEYBIND_KEY_DOWN_EVENT, KEYBIND_KEY_UP_EVENT } from "./items/shapes/KeyBind";

window.addEventListener('keydown', onKeyDownEvent);
window.addEventListener('keyup', onKeyUpEvent);

const keyToKeyCodeMapping = {
    '0': 'Digit0',
    '1': 'Digit1',
    '2': 'Digit2',
    '3': 'Digit3',
    '4': 'Digit4',
    '5': 'Digit5',
    '6': 'Digit6',
    '7': 'Digit7',
    '8': 'Digit8',
    '9': 'Digit9',
    'Up': 'ArrowUp',
    'Down': 'ArrowDown',
    'Left': 'ArrowLeft',
    'Right': 'ArrowRight',
    'Space': 'Space',
    'Enter': 'Enter',
    'Escape': 'Escape',
};


for (let i = 65; i < 90; i++) {
    const letter = String.fromCharCode(i);
    keyToKeyCodeMapping[letter] = 'Key' + letter;
}

let currentKeyBinder = null;

function onKeyDownEvent(event) {
    if (currentKeyBinder) {
        currentKeyBinder.onKeyDown(event);
    }
}

function onKeyUpEvent(event) {
    if (currentKeyBinder) {
        currentKeyBinder.onKeyUp(event);
    }
}

export class KeyBinder {
    /**
     * @param {UserEventBus} userEventBus
     */
    constructor(userEventBus, schemeContainer) {
        this.id = shortid.generate();
        this.userEventBus = userEventBus;
        this.schemeContainer = schemeContainer;
        this.loaded = false;
        this.keyBinds = {
            down: {},
            up: {},
        };
    }

    init() {
        currentKeyBinder = this;
    }

    onKeyDown(event) {
        const subscribers = this.keyBinds.down[event.code];
        if (!subscribers || !Array.isArray(subscribers)) {
            return;
        }

        for (let i = subscribers.length - 1; i >= 0; i--) {
            const item = this.schemeContainer.findItemById(subscribers[i]);
            if (item) {
                if (item.shapeProps.active) {
                    this.userEventBus.emitItemEvent(item.id, KEYBIND_KEY_DOWN_EVENT);
                }
            } else {
                // removing item from subscribers as the item most probably was removed from scene
                subscribers.splice(i, 1);
            }
        }
    }

    onKeyUp(event) {
        const subscribers = this.keyBinds.up[event.code];
        if (!subscribers || !Array.isArray(subscribers)) {
            return;
        }
        for (let i = subscribers.length - 1; i >= 0; i--) {
            const item = this.schemeContainer.findItemById(subscribers[i]);
            if (item) {
                if (item.shapeProps.active) {
                    this.userEventBus.emitItemEvent(item.id, KEYBIND_KEY_UP_EVENT);
                }
            } else {
                // removing item from subscribers as the item most probably was removed from scene
                subscribers.splice(i, 1);
            }
        }
    }

    deregisterItemEvents(item) {
        const keyCode = keyToKeyCodeMapping[item.shapeProps.key];
        if (!keyCode) {
            return;
        }

        this._deregisterItemEventsFrom(this.keyBinds.up[keyCode], item.id);
        this._deregisterItemEventsFrom(this.keyBinds.down[keyCode], item.id);
    }

    _deregisterItemEventsFrom(subscribers, itemId) {
        if (!subscribers || !Array.isArray(subscribers)) {
            return;
        }

        for (let i = subscribers.length - 1; i >= 0; i--) {
            if (subscribers[i] === itemId) {
                subscribers.splice(i, 1);
            }
        }
    }

    /**
     * @param {Item} item
     */
    registerKeyBindItem(item) {
        if (!item.shape === 'key_bind') {
            return;
        }

        const keyCode = keyToKeyCodeMapping[item.shapeProps.key];
        if (!keyCode) {
            return;
        }


        if (item.shapeProps.down) {
            if (!this.keyBinds.down.hasOwnProperty(keyCode)) {
                this.keyBinds.down[keyCode] = [];
            }
            this.keyBinds.down[keyCode].push(item.id);
        }

        if (item.shapeProps.up) {
            if (!this.keyBinds.up.hasOwnProperty(keyCode)) {
                this.keyBinds.up[keyCode] = [];
            }
            this.keyBinds.up[keyCode].push(item.id);
        }
    }

    destroy() {
        if (currentKeyBinder && currentKeyBinder.id === this.id) {
            currentKeyBinder = null;
        }
        this.keyBinds = {
            down: {},
            up: {},
        };
        this.userEventBus = null;
        this.schemeContainer = null;
    }
}