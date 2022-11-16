/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';

export default class StatePickElement extends State {
    constructor(eventBus, store, listener) {
        super(eventBus, store, 'connecting', listener);
        this.elementPickCallback = null;
        this.highlightedItemId = null;
    }

    reset() {
        this.elementPickCallback = null;
        this.resetHighlight();
    }

    mouseMove(x, y, mx, my, object, event) {
        if (object.item) {
            this.highlightItem(object.item);
        } else {
            this.resetHighlight();
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        this.resetHighlight();
        if (object.item) {
            if (this.elementPickCallback) {
                this.elementPickCallback(`#${object.item.id}`);
            }
            setTimeout(() => {
                this.cancel();
            }, 200);
        }
    }

    setElementPickCallback(elementPickCallback) {
        this.elementPickCallback = elementPickCallback;
    }

    highlightItem(item) {
        if (item.id !== this.highlightedItemId) {
            this.highlightedItemId = item.id;
            this.listener.onItemsHighlighted({itemIds: [item.id], showPins: false});
        }
    }

    resetHighlight() {
        if (this.highlightedItemId) {
            this.highlightedItemId = null;
            this.listener.onItemsHighlighted({itemIds: [], showPins: false});
        }
    }
};