<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="ssc-container" oncontextmenu="return false;" style="position: relative; display: inline-block;">
        <div class="ssc-header" style="">
            <div style="padding: 4px;">
                Zoom:
                <input v-model="textZoom" style="display: inline-block; padding: 2px 4px; border: 1px solid #555; width: 60px;" @keydown.enter="onZoomSubmitted"/>
                <span class="ssc-button" @click="zoomToScheme">Auto-Zoom</span>
            </div>
        </div>
        <svg-editor ref="svgEditor"
            :scheme-container="schemeContainer"
            :width="width"
            :height="height"
            :offset-x="offsetX"
            :offset-y="offsetY"
            :zoom="vZoom"
            mode="view" />

        <item-tooltip v-if="itemTooltip.shown" :item="itemTooltip.item" :x="itemTooltip.x" :y="itemTooltip.y" @close="itemTooltip.shown = false"/>
    </div>
</template>

<script>
import SvgEditor from '../components/editor/SvgEditor.vue';
import SchemeContainer from '../scheme/SchemeContainer';
import EventBus from '../components/editor/EventBus';
import ItemTooltip from '../components/editor/ItemTooltip.vue';
import forEach from 'lodash/forEach';

export default {
    props: ['scheme', 'width', 'height', 'offsetX', 'offsetY', 'zoom', 'autoZoom'],

    components: {SvgEditor, ItemTooltip},

    beforeMount() {
        EventBus.$on(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$on(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
    },
    beforeDestroy() {
        EventBus.$off(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$off(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
    },
    mounted() {
        if (this.autoZoom) {
            this.zoomToScheme();
        }
    },
    data() {
        return {
            schemeContainer: new SchemeContainer(this.scheme, EventBus),
            textZoom: "" + this.zoom,
            vZoom: this.zoom,

            itemTooltip: {
                item: null,
                shown: false,
                x: 0,
                y: 0
            },
        }
    },

    methods: {
        onScreenTransformUpdated(screenTransform) {
            this.textZoom = '' + Math.round(screenTransform.scale * 10000) / 100;
        },

        onItemTooltipTriggered(item, mouseX, mouseY) {
            const svgRect = this.$refs.svgEditor.$el.getBoundingClientRect();
            const absX = mouseX + svgRect.left;
            const absY = mouseY + svgRect.top;

            this.itemTooltip.item = item;
            this.itemTooltip.x = mouseX;
            this.itemTooltip.y = mouseY;
            this.itemTooltip.shown = true;
        },

        onZoomSubmitted() {
            this.vZoom = parseFloat(this.textZoom);
        },

        zoomToScheme() {
            this.zoomToItems(this.schemeContainer.getItems());
        },

        zoomToItems(items) {
            if (items && items.length > 0) {
                const area = this.getBoundingBoxOfItems(items);
                if (area) {
                    EventBus.$emit(EventBus.BRING_TO_VIEW, area);
                }
            }
        },

        getBoundingBoxOfItems(items) {
            let area = null;

            forEach(items, item => {
                if (!area) {
                    area = {x: item.area.x, y: item.area.y, w: item.area.w, h: item.area.h};
                } else {
                    if (area.x > item.area.x) {
                        area.x = item.area.x;
                    }
                    if (area.y > item.area.y) {
                        area.y = item.area.y;
                    }
                    if (area.x + area.w < item.area.x + item.area.w) {
                        area.w = item.area.x + item.area.w - area.x;
                    }
                    if (area.y + area.h < item.area.y + item.area.h) {
                        area.h = item.area.y + item.area.h - area.y;
                    }
                }
            });
            return area;
        },
    }
}
</script>