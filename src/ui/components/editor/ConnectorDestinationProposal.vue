<template>
    <div class="connector-destination-proposal" :style="{left: `${x}px`, top: `${y}px`}" oncontextmenu="return false;">
        <div v-for="item in items" class="item-container">
            <svg :width="iconWidth+'px'" :height="iconHeight+'px'">
                <item-svg :item="item" mode="edit"/>
            </svg>
        </div>
    </div>
</template>

<script>
import utils from '../../utils';
import UMLItemMenu from './item-menu/UMLItemMenu';
import GeneralItemMenu from './item-menu/GeneralItemMenu';
import forEach from 'lodash/forEach';
import ItemSvg from './items/ItemSvg.vue';

import {enrichItemWithDefaults} from '../../scheme/Item';

export default {
    props: {
        x: Number,
        y: Number,
        connectorItemId: String,
        schemeContainer: Object
    },

    components: { ItemSvg },

    beforeMount() {

    },

    data() {
        const padding = 5;
        const iconWidth = 100;
        const iconHeight = 60;

        const connectorItem = this.schemeContainer.findItemById(this.connectorItemId);
        const items = [];

        // will first propose to duplicate source item and make it its destination item
        if (connectorItem.shapeProps.sourceItem) {
            const sourceItem = this.schemeContainer.findFirstElementBySelector(connectorItem.shapeProps.sourceItem);
            if (sourceItem) {
                const item = utils.clone(sourceItem);
                item.id = null;
                item.area = {x: padding, y: padding, w: iconWidth - 2*padding, h: iconHeight - 2*padding};
                enrichItemWithDefaults(item);
                items.push(item);
            }
        }

        const appendItem = (menuEntry) => {
            const item = utils.clone(menuEntry.item);
            item.area = {x: padding, y: padding, w: iconWidth - 2*padding, h: iconHeight - 2*padding};
            item.name = menuEntry.name;
            enrichItemWithDefaults(item);
            items.push(item);
        }

        forEach(GeneralItemMenu, appendItem);
        forEach(UMLItemMenu, appendItem);

        return {
            padding,
            iconWidth,
            iconHeight,
            items
        };
    }
}
</script>