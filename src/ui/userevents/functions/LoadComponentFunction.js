/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Load component',

    description: 'Triggers loading of component. Applicable to "component" shapes only',
    args: { },

    supportedShapes: ['component'],

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        // Have to use this setTimeout trick to make sure that any previous changes to the item get rendered first
        // e.g. it is common to hide component and show it right before loading it.
        // when component item is hidden its vue component is not yet loaded and does not register handlers in EventBus
        // If user wants the progress bar to be shown in the component which was previously hidden, this is the only way to go
        // as we need to make sure this code gets executed in the next event loop cycle.
        setTimeout(() => {
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
        });
    }
};

