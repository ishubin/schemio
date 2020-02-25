/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import EventBus from '../EventBus.js';

export default class StatePickElement extends State {
    constructor(eventBus) {
        super(eventBus);
        this.name = 'connecting';
        this.elementPickCallback = null;
    }

    reset() {
        this.elementPickCallback = null;
    }

    mouseDown(x, y, mx, my, object, event) {
        if (object.item) {
            if (this.elementPickCallback) {
                this.elementPickCallback({
                    item: object.item.id
                });
            }
            setTimeout(() => {
                this.cancel();
            }, 200);
        }
    }

    setElementPickCallback(elementPickCallback) {
        this.elementPickCallback = elementPickCallback;
    }
};