<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
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
import forEach from 'lodash/forEach';
import Shape from './items/shapes/Shape';
import ItemSvg from './items/ItemSvg.vue';

import {enrichItemWithDefaults, enrichItemWithDefaultShapeProps} from '../../scheme/Item';

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

        forEach(Shape.getRegistry(), (shape, shapeId) => {
            if (shape.menuItems) {
                forEach(shape.menuItems, (menuEntry) => {
                    if (!menuEntry.imageProperty) {
                        const entry = utils.clone(menuEntry);
                        if (!entry.item) {
                            entry.item = {};
                        }
                        entry.item.shape = shapeId;
                        itemEntries.push(utils.clone(entry));
                    }
                });
            }
        });

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
            this.enrichItem(item);
            this.$emit('item-selected', item);
            this.$emit('close');
        },

        enrichItem(item) {
            enrichItemWithDefaults(item);
            enrichItemWithDefaultShapeProps(item);
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