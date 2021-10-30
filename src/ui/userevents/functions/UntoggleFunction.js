/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import EventBus from '../../components/editor/EventBus';
import SchemeContainer from '../../scheme/SchemeContainer.js';
import forEach from 'lodash/forEach';
import '../../typedef';
import { popPreviousVisibilites } from './ToggleFunction';


export default {
    name: 'Untoggle',

    description: 'Restores previous state of items before using "Toggle" function',

    args: { },

    /**
     * 
     * @param {Item} item 
     * @param {Object} args 
     * @param {SchemeContainer} schemeContainer 
     * @param {*} userEventBus 
     * @param {*} resultCallback 
     */
    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        const visibilities = popPreviousVisibilites();
        
        if (visibilities) {
            forEach(schemeContainer.getTopLevelItems(), topLevelItem => {
                topLevelItem.visible = visibilities.allItems[topLevelItem.id];
                EventBus.emitItemChanged(topLevelItem.id);
            });
        }
        resultCallback();
    }
};


