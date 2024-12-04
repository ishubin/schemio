import shortid from "shortid";
import UserEventBus from "../../userevents/UserEventBus";
import { KEYBIND_KEY_DOWN_EVENT, KEYBIND_KEY_UP_EVENT } from "./items/shapes/KeyBind";
import { traverseItems } from "../../scheme/Item";

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
    constructor() {
        this.id = shortid.generate();
        this.loaded = false;
        this.keyBinds = {
            down: {},
            up: {},
        };
    }

    init() {
        currentKeyBinder = this;
    }

    /**
     *
     * @param {SchemeContainer} schemeContainer
     * @param {UserEventBus} userEventBus
     */
    registerAllKeyBinders(schemeContainer, userEventBus) {
        traverseItems(schemeContainer.scheme.items, (item) => {
            if (item.meta.componentSchemeContainer && item.meta.componentUserEventBus) {
                this.registerAllKeyBinders(item.meta.componentSchemeContainer, item.meta.componentUserEventBus);
            } else if (item.shape === 'key_bind') {
                this.registerKeyBindItem(item, schemeContainer, userEventBus);
            }
        });
    }

    onKeyDown(event) {
        const subscribers = this.keyBinds.down[event.code];
        if (!subscribers || !Array.isArray(subscribers)) {
            return;
        }

        for (let i = subscribers.length - 1; i >= 0; i--) {
            const {itemId, schemeContainer, userEventBus} = subscribers[i];
            const item = schemeContainer.findItemById(itemId);
            if (item) {
                if (item.shapeProps.active) {
                    userEventBus.emitItemEvent(item.id, KEYBIND_KEY_DOWN_EVENT);
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
            const {itemId, schemeContainer, userEventBus} = subscribers[i];
            const item = schemeContainer.findItemById(itemId);
            if (item) {
                if (item.shapeProps.active) {
                    userEventBus.emitItemEvent(item.id, KEYBIND_KEY_UP_EVENT);
                }
            } else {
                // removing item from subscribers as the item most probably was removed from scene
                subscribers.splice(i, 1);
            }
        }
    }

    deregisterEventsForSchemeContainer(schemeContainerId) {
        for (let keyCode in this.keyBinds.up) {
            if (this.keyBinds.up.hasOwnProperty(keyCode)) {
                this._deregisterEventsForSchemeContainer(this.keyBinds.up[keyCode], schemeContainerId);
            }
        }
        for (let keyCode in this.keyBinds.down) {
            if (this.keyBinds.down.hasOwnProperty(keyCode)) {
                this._deregisterEventsForSchemeContainer(this.keyBinds.down[keyCode], schemeContainerId);
            }
        }
    }

    _deregisterEventsForSchemeContainer(subscribers, schemeContainerId) {
        if (!subscribers || !Array.isArray(subscribers)) {
            return;
        }

        for (let i = subscribers.length - 1; i >= 0; i--) {
            if (subscribers[i].schemeContainer.id === schemeContainerId) {
                subscribers.splice(i, 1);
            }
        }
    }

    /**
     * @param {Item} item
     * @param {SchemeContainer} schemeContainer
     * @param {UserEventBus} userEventBus
     */
    registerKeyBindItem(item, schemeContainer, userEventBus) {
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
            this.keyBinds.down[keyCode].push({
                itemId: item.id,
                userEventBus,
                schemeContainer
            });
        }

        if (item.shapeProps.up) {
            if (!this.keyBinds.up.hasOwnProperty(keyCode)) {
                this.keyBinds.up[keyCode] = [];
            }
            this.keyBinds.up[keyCode].push({
                itemId: item.id,
                userEventBus,
                schemeContainer
            });
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