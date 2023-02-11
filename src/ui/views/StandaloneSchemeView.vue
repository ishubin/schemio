<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="ssc-container" oncontextmenu="return false;" style="position: relative;">
        <div class="ssc-header">
            <div class="ssc-header-search">
                Zoom:
                <input class="ssc-zoom" type="text" v-model="textZoom" @blur="onZoomSubmitted" @keydown.enter="onZoomSubmitted"/>
                <span class="ssc-button" @click="zoomToScheme">Auto-Zoom</span>
            </div>
            <div class="ssc-header-right">
                built by <a target="_top" :href="homeLink">Schemio</a>
            </div>
        </div>
        <div class="ssc-body">
            <SvgEditor ref="svgEditor"
                v-if="schemeContainer"
                :editorId="editorId"
                :scheme-container="schemeContainer"
                :zoom="vZoom"
                :use-mouse-wheel="useMouseWheel"
                mode="view"
                :userEventBus="userEventBus"
                :highlightedItems="highlightedItems"
                @mouse-wheel="mouseWheel"
                @mouse-move="mouseMove"
                @mouse-down="mouseDown"
                @mouse-up="mouseUp"
                @mouse-double-click="mouseDoubleClick"
                @item-tooltip-requested="onItemTooltipTriggered"
                @item-side-panel-requested="onItemSidePanelTriggered"
                @screen-transform-updated="onScreenTransformUpdated"
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
import EditorEventBus from '../components/editor/EditorEventBus';
import ItemTooltip from '../components/editor/ItemTooltip.vue';
import ItemDetails from '../components/editor/ItemDetails.vue';
import forEach from 'lodash/forEach';
import store from '../store/Store';
import UserEventBus from '../userevents/UserEventBus';
import StateInteract from '../components/editor/states/StateInteract';
import { collectAndLoadAllMissingShapes } from '../components/editor/items/shapes/ExtraShapes';
import {createAnimationRegistry, destroyAnimationRegistry} from '../animations/AnimationRegistry';
import shortid from 'shortid';



export default {
    props: {
        scheme        : {type: Object},
        zoom          : {type: Number, default: 100},
        autoZoom      : {type: Boolean, default: true},
        sidePanelWidth: {type: Number, default: 400},
        useMouseWheel : {type: Boolean, default: true},
        homeLink      : {type: String, default: 'https://github.com/ishubin/schemio'}
    },

    components: {SvgEditor, ItemTooltip, ItemDetails},

    beforeMount() {
        this.initSchemeContainer();

        EditorEventBus.screenTransformUpdated.$on(this.editorId, this.onScreenTransformUpdated);
        EditorEventBus.void.clicked.$on(this.editorId, this.onVoidClicked);
        this.startStateLoop();
    },
    beforeDestroy() {
        EditorEventBus.screenTransformUpdated.$off(this.editorId, this.onScreenTransformUpdated);
        EditorEventBus.void.clicked.$off(this.editorId, this.onVoidClicked);
        destroyAnimationRegistry(this.editorId);
        this.stopStateLoop();
    },
    created() {
        this.animationRegistry = createAnimationRegistry(this.editorId);
        this.userEventBus = new UserEventBus();
        this.stateInteract = new StateInteract(this.editorId, store, this.userEventBus, {
            onCancel: () => {},
            onItemClicked: (item) => EditorEventBus.item.clicked.any.$emit(this.editorId, item),
            onItemChanged: (itemId, propertyPath) => EditorEventBus.item.changed.specific.$emit(this.editorId, itemId, propertyPath),
            onVoidClicked: () => EditorEventBus.void.clicked.$emit(this.editorId),
            onItemTooltipRequested: (item, mx, my) => this.onItemTooltipTriggered(item, mx, my),
            onItemSidePanelRequested: (item) => this.onItemSidePanelTriggered(item),
            onItemLinksShowRequested: (item) => EditorEventBus.item.linksShowRequested.any.$emit(this.editorId, item),
            onScreenTransformUpdated: (screenTransform) => this.onScreenTransformUpdated(screenTransform),
            onItemsHighlighted: (highlightedItems) => this.highlightedItems = highlightedItems,
            onSubStateMigrated: () => {},
        });
    },
    data() {
        return {
            editorId: 'standalone-' + shortid.generate(),
            schemeContainer: null,
            initialized: false,
            textZoom: "" + this.zoom,
            vZoom: this.zoom,

            itemTooltip: {
                item: null,
                shown: false,
                x: 0,
                y: 0
            },

            highlightedItems: {
                itemIds: [],
                showPins: false
            },

            sidePanel: {
                item: null
            },

            isStateLooping: false
        }
    },

    methods: {
        initSchemeContainer() {
            collectAndLoadAllMissingShapes(this.scheme.items, this.$store)
            .catch(err => {
                console.error('Failed to load shapes', err);
            })
            .then(() => {
                this.schemeContainer = new SchemeContainer(this.scheme, this.editorId);
                this.stateInteract.schemeContainer = this.schemeContainer;
                const boundingBox = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.filterNonHUDItems(this.schemeContainer.getItems()));
                this.schemeContainer.screenSettings.boundingBox = boundingBox;
                this.stateInteract.reset();
                this.initialized = true;
                if (this.autoZoom) {
                    this.zoomToScheme();
                }
            });
        },

        mouseWheel(x, y, mx, my, event) {
            if (this.initialized) {
                this.stateInteract.mouseWheel(x, y, mx, my, event);
            }
        },

        mouseDown(worldX, worldY, screenX, screenY, object, event) {
            if (this.initialized) {
                this.stateInteract.mouseDown(worldX, worldY, screenX, screenY, object, event);
            }
        },

        mouseUp(worldX, worldY, screenX, screenY, object, event) {
            if (this.initialized) {
                this.stateInteract.mouseUp(worldX, worldY, screenX, screenY, object, event);
            }
        },

        mouseMove(worldX, worldY, screenX, screenY, object, event) {
            if (this.initialized) {
                this.stateInteract.mouseMove(worldX, worldY, screenX, screenY, object, event);
            }
        },

        mouseDoubleClick(worldX, worldY, screenX, screenY, object, event) {
            if (this.initialized) {
                this.stateInteract.mouseDoubleClick(worldX, worldY, screenX, screenY, object, event);
            }
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
            if (this.initialized) {
                this.schemeContainer.screenTransform.scale = this.vZoom / 100.0;
            }
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
                    EditorEventBus.zoomToAreaRequested.$emit(this.editorId, area, false);
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

        startStateLoop() {
            this.isStateLooping = true;
            this.stateLoop(0);
        },

        stateLoop(deltaTime) {
            const oldTime = performance.now();
            this.stateInteract.loop(deltaTime);
            if (this.isStateLooping) {
                window.requestAnimationFrame(() => {
                    this.stateLoop(performance.now() - oldTime);
                });
            }
        },

        stopStateLoop() {
            this.isStateLooping = false;
        },
    }
}
</script>