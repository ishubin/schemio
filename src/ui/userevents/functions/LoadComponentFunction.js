/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Load component',

    description: 'Triggers loading of component. Applicaple to "component" shapes only',
    args: { },

    supportedShapes: ['component'],

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item || !item.shape === 'component') {
            resultCallback();
            return;
        }

        const eventBus = schemeContainer.getEventBus();
        if (!eventBus) {
            resultCallback();
            return;
        }

        eventBus.emitComponentLoadRequested(item);
        resultCallback();
    }
};

