<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="ssc-container" oncontextmenu="return false;" style="position: relative;">
        <div v-if="headerEnabled" class="ssc-header" :style="{background: headerBackground}">
            <div class="ssc-header-search">
                <span v-if="zoomInput" :style="{'color': headerColor}">Zoom:</span>
                <input v-if="zoomInput" class="ssc-zoom" type="text" v-model="textZoom" @blur="onZoomSubmitted" @keydown.enter="onZoomSubmitted"/>
                <span v-if="zoomButton" class="ssc-button" @click="zoomToScheme">Auto-Zoom</span>
            </div>
            <div class="ssc-header-right">
                <span :style="{'color': headerColor}">built by</span>
                <a :style="{'color': linkColor}"  target="_top" :href="homeLink">Schemio</a>
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
                @screen-transform-updated="onScreenTransformUpdated"
                />

            <item-tooltip :key="`item-tooltip-${itemTooltip.id}`" v-if="itemTooltip.shown" :item="itemTooltip.item" :x="itemTooltip.x" :y="itemTooltip.y" @close="itemTooltip.shown = false"/>

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
import {forEach} from '../collections';
import store from '../store/Store';
import UserEventBus from '../userevents/UserEventBus';
import StateInteract from '../components/editor/states/StateInteract';
import { collectAndLoadAllMissingShapes } from '../components/editor/items/shapes/ExtraShapes';
import {createAnimationRegistry} from '../animations/AnimationRegistry';
import shortid from 'shortid';
import { filterNonHUDItems } from '../scheme/ItemMath';



export default {
    props: {
        scheme          : {type: Object},
        zoom            : {type: Number, default: 100},
        autoZoom        : {type: Boolean, default: true},
        sidePanelWidth  : {type: Number, default: 400},
        useMouseWheel   : {type: Boolean, default: true},
        homeLink        : {type: String, default: 'https://github.com/ishubin/schemio'},
        linkColor       : {type: String, default: '#b0d8f5'},
        headerBackground: {type: String, default: '#555'},
        headerColor     : {type: String, default: '#f0f0f0'},
        headerEnabled   : {type: Boolean, default: true},
        zoomButton      : {type: Boolean, default: true},
        zoomInput       : {type: Boolean, default: true},
    },

    components: {SvgEditor, ItemTooltip, ItemDetails},

    beforeMount() {
        this.initSchemeContainer();

        EditorEventBus.screenTransformUpdated.$on(this.editorId, this.onScreenTransformUpdated);
        EditorEventBus.item.changed.any.$on(this.editorId, this.onAnyItemChanged);
        EditorEventBus.void.clicked.$on(this.editorId, this.onVoidClicked);
        this.startStateLoop();
    },
    beforeDestroy() {
        EditorEventBus.screenTransformUpdated.$off(this.editorId, this.onScreenTransformUpdated);
        EditorEventBus.item.changed.any.$off(this.editorId, this.onAnyItemChanged);
        EditorEventBus.void.clicked.$off(this.editorId, this.onVoidClicked);
        this.animationRegistry.destroy();
        this.stopStateLoop();
    },
    created() {
        this.animationRegistry = createAnimationRegistry(this.editorId);
        this.userEventBus = new UserEventBus(this.editorId);
        this.stateInteract = new StateInteract(this.editorId, store, this.userEventBus, {
            onCancel: () => {},
            onItemChanged: (itemId, propertyPath) => EditorEventBus.item.changed.specific.$emit(this.editorId, itemId, propertyPath),
            onItemClicked: (item) => this.onInteractItemClicked(item),
            onVoidClicked: () => this.onInteractVoidClicked(),
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
                id: null,
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
        onAnyItemChanged(itemId) {
            this.stateInteract.onItemChanged(itemId);
        },

        initSchemeContainer() {
            collectAndLoadAllMissingShapes(this.scheme.items, this.$store)
            .catch(err => {
                console.error('Failed to load shapes', err);
            })
            .then(() => {
                this.schemeContainer = new SchemeContainer(this.scheme, this.editorId, 'view', this.$store.state.apiClient);
                this.stateInteract.schemeContainer = this.schemeContainer;
                const boundingBox = this.schemeContainer.getBoundingBoxOfItems(filterNonHUDItems(this.schemeContainer.getItems()));
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

        onInteractVoidClicked() {
            this.itemTooltip.shown = false;
            EditorEventBus.void.clicked.$emit(this.editorId);
        },
        onInteractItemClicked(item) {
            this.itemTooltip.shown = false;
            EditorEventBus.item.clicked.any.$emit(this.editorId, item);
        },
        onItemTooltipTriggered(item, mouseX, mouseY) {
            this.itemTooltip.id = item.id;
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
            this.stateInteract.loop(Math.min(100.0, deltaTime));
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