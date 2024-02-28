/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Keys } from '../../../events.js';
import State, { DragScreenState, SubState } from './State.js';

export default class StatePickElement extends State {
    constructor(editorId, store, listener) {
        super(editorId, store, 'connecting', listener);
        this.elementPickCallback = null;
        this.highlightedItemId = null;
    }

    reset() {
        this.elementPickCallback = null;
        this.migrateSubState(new IdlePickState(this, this.listener));
    }

    setElementPickCallback(elementPickCallback) {
        this.elementPickCallback = elementPickCallback;
    }

};


class IdlePickState extends SubState {
    constructor(parentState, listener) {
        super(parentState, 'idle');
        this.listener = listener;
    }

    reset() {
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
            if (this.parentState.elementPickCallback) {
                this.parentState.elementPickCallback(`#${object.item.id}`);
            }
            setTimeout(() => {
                this.cancel();
            }, 200);
        }
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

    keyPressed(key, keyOptions) {
        if (key === Keys.SPACE) {

            if (!this.parentState.subState || this.parentState.subState.name !== 'drag-screen') {
                this.migrate(new DragScreenState(this.parentState, false));
            }
            return;
        }
    }
}