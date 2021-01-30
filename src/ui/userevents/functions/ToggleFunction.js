import EventBus from '../../components/editor/EventBus';
import SchemeContainer from '../../scheme/SchemeContainer.js';
import forEach from 'lodash/forEach';
import '../../typedef';


// Stack of visiblity states for all top-level items
const visibilitiesStack = [];

export function popPreviousVisibilites() {
    if (visibilitiesStack.length > 0) {
        return visibilitiesStack.pop();
    }
    return null;
}


export default {
    name: 'Toggle',

    description: 'Hides all other items on screen, leaving only the selected item visible',

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
        const visibilities = {
            itemId: item.id,
            allItems: {}
        };

        forEach(schemeContainer.getTopLevelItems(), topLevelItem => {
            visibilities.allItems[topLevelItem.id] = topLevelItem.visible;

            if (topLevelItem.id !== item.id) {
                topLevelItem.visible = false;
                EventBus.emitItemChanged(topLevelItem.id);
            }
        });
        
        // checking whether the item was toggled already
        if (visibilitiesStack.length === 0 || visibilitiesStack[visibilitiesStack.length - 1].itemId !== item.id) {
            visibilitiesStack.push(visibilities);
        }

        item.visible = true;
        EventBus.emitItemChanged(item.id);

        resultCallback();
    }
};

