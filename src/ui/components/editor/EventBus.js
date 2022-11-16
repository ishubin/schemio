/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import {Logger} from '../../logger';
import '../../typedef';
import {identifyKeyPress} from '../../events';

const log = new Logger('EventBus');

/*
This whole event bus is pretty much an anti-pattern and a very bad idea that I wished I have never picked up on.
It only works in case there is a single scheme editor component. In situations when there are multiple editors open at the same time,
this just does not work well and we have to come up with tricks like activating/deactivating scheme editors.
 */
const EventBus = new Vue({
    data() {
        return {
            KEY_PRESS: 'key-press',
            KEY_UP: 'key-up',
        };
    },
});

// Adding logging of all events in EventBus
const _old$emit = EventBus.$emit;

EventBus.$emit = (...args) => {
    log.infoEvent(args[0], args);
    if (_old$emit) {
        _old$emit.apply(EventBus, args);
    }
};


document.addEventListener('keyup', (event) => {
    event = event || window.event;
    if (event.target === document.body) {
        const key = identifyKeyPress(event);
        if (key) {
            event.preventDefault();
            EventBus.$emit(EventBus.KEY_UP, key, {
                ctrlCmdPressed: event.metaKey || event.ctrlKey
            });
        }
    }
});
document.addEventListener('keydown', (event) => {
    event = event || window.event;
    if (event.target === document.body) {
        const key = identifyKeyPress(event);
        if (key) {
            event.preventDefault();
            EventBus.$emit(EventBus.KEY_PRESS, key, {
                ctrlCmdPressed: event.metaKey || event.ctrlKey
            });
        }
    }
});

export default EventBus;
