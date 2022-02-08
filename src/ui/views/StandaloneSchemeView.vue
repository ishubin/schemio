<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="ssc-container" oncontextmenu="return false;" style="position: relative;">
        <div class="ssc-header">
            <div class="ssc-header-search">
                Zoom:
                <input class="ssc-zoom" type="text" v-model="textZoom" @keydown.enter="onZoomSubmitted"/>
                <span class="ssc-button" @click="zoomToScheme">Auto-Zoom</span>
            </div>
            <div class="ssc-header-right">
                built by <a target="_top" :href="homeLink">Schemio</a>
            </div>
        </div>
        <div class="ssc-body">
            <svg-editor ref="svgEditor"
                :scheme-container="schemeContainer"
                :offset-x="offsetX"
                :offset-y="offsetY"
                :zoom="vZoom"
                :use-mouse-wheel="useMouseWheel"
                mode="view" 
                :userEventBus="userEventBus"
                @mouse-wheel="mouseWheel"
                @mouse-move="mouseMove"
                @mouse-down="mouseDown"
                @mouse-up="mouseUp"
                @mouse-double-click="mouseDoubleClick"
                />

            <item-tooltip v-if="itemTooltip.shown" :item="itemTooltip.item" :x="itemTooltip.x" :y="itemTooltip.y" @close="itemTooltip.shown = false"/>

            <div class="ssc-side-panel-right" v-if="sidePanel.item" :style="{width: `${sidePanelWidth}px`}">
                <div class="ssc-side-panel-content">
                    <span class="ssc-button" @click="sidePanel.item = null">Close</span>
                    <item-details :item="sidePanel.item"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import SvgEditor from '../components/editor/SvgEditor.vue';
import SchemeContainer from '../scheme/SchemeContainer';
import EventBus from '../components/editor/EventBus';
import ItemTooltip from '../components/editor/ItemTooltip.vue';
import ItemDetails from '../components/editor/ItemDetails.vue';
import forEach from 'lodash/forEach';
import store from '../store/Store';
import UserEventBus from '../userevents/UserEventBus';
import StateInteract from '../components/editor/states/StateInteract';


const userEventBus = new UserEventBus();
const stateInteract = new StateInteract(EventBus, store, userEventBus);

export default {
    props: ['scheme', 'offsetX', 'offsetY', 'zoom', 'autoZoom', 'sidePanelWidth', 'useMouseWheel', 'homeLink'],

    components: {SvgEditor, ItemTooltip, ItemDetails},

    beforeMount() {
        stateInteract.schemeContainer = this.schemeContainer;
        stateInteract.reset();

        EventBus.$on(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$on(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$on(EventBus.ITEM_SIDE_PANEL_TRIGGERED, this.onItemSidePanelTriggered);
        EventBus.$on(EventBus.VOID_CLICKED, this.onVoidClicked);
    },
    beforeDestroy() {
        EventBus.$off(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$off(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$off(EventBus.ITEM_SIDE_PANEL_TRIGGERED, this.onItemSidePanelTriggered);
        EventBus.$off(EventBus.VOID_CLICKED, this.onVoidClicked);
    },
    mounted() {
        if (this.autoZoom) {
            this.zoomToScheme();
        }
    },
    data() {
        return {
            schemeContainer: new SchemeContainer(this.scheme, EventBus),
            userEventBus,
            textZoom: "" + this.zoom,
            vZoom: this.zoom,

            itemTooltip: {
                item: null,
                shown: false,
                x: 0,
                y: 0
            },

            sidePanel: {
                item: null
            }
        }
    },

    methods: {
        mouseWheel(x, y, mx, my, event) {
            stateInteract.mouseWheel(x, y, mx, my, event);
        },

        mouseDown(worldX, worldY, screenX, screenY, object, event) {
            stateInteract.mouseDown(worldX, worldY, screenX, screenY, object, event);
        },

        mouseUp(worldX, worldY, screenX, screenY, object, event) {
            stateInteract.mouseUp(worldX, worldY, screenX, screenY, object, event);
        },

        mouseMove(worldX, worldY, screenX, screenY, object, event) {
            stateInteract.mouseMove(worldX, worldY, screenX, screenY, object, event);
        },

        mouseDoubleClick(worldX, worldY, screenX, screenY, object, event) {
            stateInteract.mouseDoubleClick(worldX, worldY, screenX, screenY, object, event);
        },

        onScreenTransformUpdated(screenTransform) {
            this.textZoom = '' + Math.round(screenTransform.scale * 10000) / 100;
        },

        onItemTooltipTriggered(item, mouseX, mouseY) {
            this.itemTooltip.item = item;
            this.itemTooltip.x = mouseX;
            this.itemTooltip.y = mouseY;
            this.itemTooltip.shown = true;
        },

        onItemSidePanelTriggered(item) {
            this.sidePanel.item = item;
        },

        onZoomSubmitted() {
            this.vZoom = parseFloat(this.textZoom);
            this.schemeContainer.screenTransform.scale = this.vZoom / 100.0;
        },

        onVoidClicked() {
            this.sidePanel.item = null;
        },

        zoomToScheme() {
            this.zoomToItems(this.schemeContainer.getItems());
        },

        zoomToItems(items) {
            if (items && items.length > 0) {
                const area = this.getBoundingBoxOfItems(items);
                if (area) {
                    EventBus.emitBringToViewInstantly(area);
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