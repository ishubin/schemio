/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import EventBus from "../../components/editor/EventBus";

export default {
    name: 'Destroy component',

    description: 'Removes all the loaded items of the component. Applicable to "component" shapes only',
    args: { },

    supportedShapes: ['component'],

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        try {
            item._childItems = {};
            schemeContainer.reindexItems();
            EventBus.emitItemChanged(item.id);
        }
        catch(err) {
            console.error(err);
        }
        resultCallback();
    }
};


