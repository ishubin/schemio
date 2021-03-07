<template>
    <div ref="panelContainer" class="connector-destination-proposal" :style="{left: `${position.left}px`, top: `${position.top}px`}" oncontextmenu="return false;">
        <div class="item-menu">
            <div v-for="item in itemEntries" :title="item.name" class="item-container" @click="onDestinationItemSelected(item)">
                <img v-if="item.iconUrl" :src="item.iconUrl" width="42px" height="32px"/>
            </div>
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

    mounted() {
        document.body.addEventListener('click', this.onBodyClick);
        document.body.addEventListener('keydown', this.onGlobalKeydown);

    
        const rect = this.$refs.panelContainer.getBoundingClientRect();

        if (rect.bottom > window.innerHeight) {
            this.position.top = window.innerHeight - rect.height - 40;
        }
        if (rect.right > window.innerWidth) {
            this.position.left = window.innerWidth - rect.width - 40;
        }
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
        document.body.removeEventListener('keydown', this.onGlobalKeydown);
    },

    data() {
        const itemEntries = [];

        const appendItem = (menuEntry) => {
            if (!menuEntry.imageProperty) {
                itemEntries.push(menuEntry);
            }
        }

        forEach(GeneralItemMenu, appendItem);
        forEach(UMLItemMenu, appendItem);

        return {
            itemEntries,
            position: {
                left: this.x,
                top: this.y
            }
        };
    },

    methods: {
        onDestinationItemSelected(itemEntry) {
            const item = utils.clone(itemEntry.item);
            item.name = itemEntry.name;
            enrichItemWithDefaults(item);
            this.$emit('item-selected', item);
            this.$emit('close');
        },

        onBodyClick(event) {
            if (!event.target || !event.target.closest('.connector-destination-proposal')) {
                this.$emit('close');
            }
        },
        onGlobalKeydown(event) {
            this.$emit('close');
        }
    }
}
</script>