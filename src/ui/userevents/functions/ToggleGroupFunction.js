/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import SchemeContainer from '../../scheme/SchemeContainer.js';
import {forEach, find} from '../../collections';
import '../../typedef';
import EditorEventBus from '../../components/editor/EditorEventBus';



export default {
    name: 'Toggle in group',

    description: 'Hides all other items of by specified tag, leaving only the specified item visible',

    args: {
        group: { name: 'Tag', type: 'element', description: 'Tag representing a group of items that will be hidden instead of the toggled item'},
    },

    argsToShortString(args) {
        if (args.group) {
            return args.group;
        } else {
            return '...';
        }
    },

    // Means that this function is always expected to get array of items and in cases when it is applied
    // to a group of items - it will only be invoked once with array of those items as a first argument
    multiItem: true,

    /**
     *
     * @param {Array} items
     * @param {Object} args
     * @param {SchemeContainer} schemeContainer
     * @param {*} userEventBus
     * @param {*} resultCallback
     */
    execute(items, args, schemeContainer, userEventBus, resultCallback) {
        const groupItems = schemeContainer.findElementsBySelector(args.group);

        forEach(groupItems, groupItem => {
            if (!find(items, item => item.id === groupItem.id)) {
                groupItem.visible = false;
                EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, groupItem.id);
            }
        });
        forEach(items, item => {
            item.visible = true;
            EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
        });

        resultCallback();
    }
};


