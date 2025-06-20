<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="quick-helper-panel-wrapper text-nonselectable">
        <div class="quick-helper-panel">
            <div v-if="menuOptions && menuOptions.length > 0" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <a :href="rootPath" class="schemio-logo">
                            <img :src="`${assetsPath}/images/schemio-logo-white.small.png`"/>
                        </a>
                    </li>
                    <li>
                        <menu-dropdown name="" icon-class="fas fa-bars" :options="menuOptions" />
                    </li>
                </ul>
            </div>

            <div class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <span title="Zoom to Selection" class="toggle-button" @click="$emit('clicked-zoom-to-selection')"><i class="fas fa-bullseye"></i></span>
                    </li>
                    <li v-if="(editAllowed && shouldShowBaseControls && modeControlEnabled)">
                        <div class="toggle-group">
                            <span v-for="knownMode in knownModes" class="toggle-button"
                                :class="['mode-' + knownMode, mode === knownMode ? 'toggled' : '']"
                                @click="$emit('mode-changed', knownMode)"
                                >
                                <i v-if="knownMode === 'edit'" class="fas fa-edit"></i>
                                <i v-if="knownMode === 'view'" class="fas fa-eye"></i>
                                {{knownMode}}
                            </span>
                        </div>
                    </li>
                    <li>
                        <div class="zoom-control">
                            <span class="zoom-button zoom-out" @click="onZoomOutClicked"><i class="fas fa-search-minus"></i></span>
                            <dropdown :options="zoomOptions" :inline="true" :hover-effect="false" :search-enabled="false" @selected="onZoomOptionSelected">
                                <input type="text" :value="zoom" @keydown.enter="onZoomSubmit" style="min-width: 45px; font-size: 12px; padding-left: 1px; padding-right: 1px;"/>
                            </dropdown>
                            <span class="zoom-button zoom-in" @click="onZoomInClicked"><i class="fas fa-search-plus"></i></span>
                        </div>
                    </li>
                    <li v-if="shouldShowBaseControls">
                        <input class="textfield" style="width: 110px;" type="text" v-model="searchKeyword" placeholder="Search..."  v-on:keydown.enter="toggleSearchedItems"/>
                        <span v-if="searchKeyword" class="reset-search" @click="searchKeyword = ''" title="Reset search"><i class="fa-solid fa-circle-xmark"></i></span>
                    </li>
                </ul>
            </div>

            <div class="quick-helper-panel-section" v-if="mode === 'view'">
                <ul class="button-group">
                    <li>
                        <span title="Toggle clickable items" class="toggle-button" @click="toggleClickableMarkers()">
                            <i class="fa-solid fa-hand-pointer"></i>
                        </span>
                    </li>
                    <li>
                        <span title="Toggle text selection" class="toggle-button" :class="{toggled: textSelectionEnabled}" @click="toggleTextSelection">
                            <i class="fa-solid fa-i-cursor"></i>
                        </span>
                    </li>
                </ul>
            </div>

            <div class="quick-helper-panel-section" v-if="(mode === 'edit' && state !== 'draw')">
                <ul class="button-group">
                    <li v-if="state === 'dragItem'">
                        <span title="Grab screen" class="toggle-button" :class="{toggled: isScreenGrabbing}" @click="$emit('clicked-grab-screen')"><i class="fa-solid fa-hand"></i></span>
                    </li>
                    <li>
                        <span title="Undo" class="toggle-button" :class="{'disabled': !historyUndoable}" @click="$emit('clicked-undo')"><i class="fas fa-undo"></i></span>
                    </li>
                    <li>
                        <span title="Redo" class="toggle-button" :class="{'disabled': !historyRedoable}" @click="$emit('clicked-redo')"><i class="fas fa-redo"></i></span>
                    </li>
                    <li>
                        <span title="Snap to Grid" class="toggle-button" :class="{toggled: shouldSnapToGrid}" @click="toggleSnapToGrid(!shouldSnapToGrid)">
                            <i class="fas fa-magnet"></i>
                            <i class="small-letter">G</i>
                        </span>
                    </li>
                    <li>
                        <span title="Snap to Items" class="toggle-button" :class="{toggled: shouldSnapToItems}" @click="toggleSnapToItems(!shouldSnapToItems)">
                            <i class="fas fa-magnet"></i>
                        </span>
                    </li>
                </ul>
            </div>
            <div class="quick-helper-panel-section" v-if="(mode === 'edit' && selectedItemsCount > 0 && shouldShowBaseControls)">
                <ul class="button-group">
                    <li>
                        <span class="toggle-button" title="Remove" @click="removeSelectedItems()"> <i class="fas fa-trash"></i> </span>
                    </li>
                    <li>
                        <span class="toggle-button" title="Bring To Front" @click="$emit('clicked-bring-to-front')">
                            <img :src="`${assetsPath}/images/helper-panel/bring-to-front.svg`" width="18px"/>
                        </span>
                    </li>
                    <li>
                        <span class="toggle-button" title="Bring To Back" @click="$emit('clicked-bring-to-back')">
                            <img :src="`${assetsPath}/images/helper-panel/bring-to-back.svg`" width="18px"/>
                        </span>
                    </li>
                </ul>
            </div>
            <div class="quick-helper-panel-section" v-if="(mode === 'edit' && selectedItemsCount > 0 && shouldShowBaseControls)">
                <ul class="button-group">
                    <li v-if="supportsFill">
                        <AdvancedColorEditor
                            :editorId="editorId"
                            :value="fillColor"
                            width="18px"
                            height="18px"
                            @changed="emitShapePropChange('fill', 'advanced-color', $event)" />
                    </li>
                    <li v-if="strokeItem">
                        <StrokeControl
                            :key="`stroke-control-${firstSelectedItem.id}-${firstSelectedItem.shape}`"
                            :editorId="editorId"
                            :item="strokeItem"
                            @color-changed="emitShapePropChange('strokeColor', 'color', $event)"
                            @size-changed="emitShapePropChange('strokeSize', 'number', $event)"
                            @pattern-changed="emitShapePropChange('strokePattern', 'stroke-pattern', $event)"
                            @collapsed="onStrokeControlCollapsed"
                            @expanded="onStrokeControlExpanded"
                            />
                    </li>
                    <li v-if="textStyleItem">
                        <TextStyleControl
                            :key="`text-style-control-${firstSelectedItem.id}-${firstSelectedItem.shape}`"
                            :editorId="editorId"
                            :item="textStyleItem"
                            @property-changed="onTextStylePropertyChange"
                            />
                    </li>
                    <li v-if="shouldShowPathCaps">
                        <path-cap-dropdown
                            :key="`qhp-path-cap-source-${firstSelectedItem.meta.revision}`"
                            :value="pathSourceCap"
                            :is-source="true"
                            :is-thick="firstSelectedItem.shape === 'connector' && firstSelectedItem.shapeProps.thick"
                            width="16px"
                            :height="15"
                            @selected="emitShapePropChange('sourceCap', 'path-cap', $event)"/>
                    </li>
                    <li v-if="shouldShowPathCaps">
                        <path-cap-dropdown
                            :key="`qhp-path-cap-destination-${firstSelectedItem.meta.revision}`"
                            :value="pathDestinationCap"
                            :is-source="false"
                            :is-thick="firstSelectedItem.shape === 'connector' && firstSelectedItem.shapeProps.thick"
                            width="16px"
                            :height="15"
                            @selected="emitShapePropChange('destinationCap', 'path-cap', $event)"/>
                    </li>
                </ul>
            </div>
            <div class="quick-helper-panel-section" v-if="mode === 'edit' && shouldShowConnectorControls">
                <ul class="button-group">
                    <li v-for="connectorType in connectorTypes">
                        <span class="toggle-button img-button" :class="{'dimmed': currentConnectorSmoothing != connectorType}" :title="connectorType" @click="setConnectorSmoothing(connectorType)">
                            <img :src="`${assetsPath}/images/helper-panel/connector-${connectorType}.svg`"/>
                        </span>
                    </li>
                </ul>
            </div>

            <div v-if="(mode === 'edit' && isDrawing)" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <span @click="stopDrawing" class="btn btn-small btn-secondary" title="Stop drawing">Stop drawing</span>
                    </li>
                </ul>
            </div>
            <div v-if="(mode === 'edit' && state === 'connecting')" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <span @click="stopConnecting" class="btn btn-small btn-secondary" title="Stop connecting">Stop</span>
                    </li>
                </ul>
            </div>

            <div v-if="(mode === 'edit' && shouldShowBaseControls)" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <div class="toggle-group">
                            <span class="toggle-button" :class="{toggled: autoRemount}" @click="toggleAutoRemount" title="Automatically mount items into other items">
                                <i class="fa-solid fa-person-arrow-down-to-line"></i>
                            </span>
                            <span class="toggle-button" :class="{toggled: showPivot}" @click="togglePivot" title="Pivot">
                                <i class="fa-solid fa-crosshairs"></i>
                            </span>
                            <span class="toggle-button" :class="{toggled: showItemDetailMarkers}" @click="toggleItemDetailMarkers" title="Show icons of items that have description or links">
                                <i class="icon fa-solid fa-paragraph"></i>
                            </span>
                        </div>
                    </li>
                </ul>
            </div>
            <div v-if="mode === 'edit' && itemSurround.shown" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <NumberTextfield class="quick-helper-number-textfield" :value="itemSurround.padding" name="Padding" @changed="onItemSurroundPaddingChanged"/>
                    </li>
                </ul>
            </div>
            <slot>

            </slot>

        </div>
    </div>
</template>


<script>
import '../../typedef';
import Dropdown from '../../components/Dropdown.vue';
import StrokeControl from './StrokeControl.vue';
import TextStyleControl from './TextStyleControl.vue';
import AdvancedColorEditor from './AdvancedColorEditor.vue';
import ColorPicker from './ColorPicker.vue';
import StrokePatternDropdown from './StrokePatternDropdown.vue';
import PathCapDropdown from './PathCapDropdown.vue';
import NumberTextfield from '../NumberTextfield.vue';
import MenuDropdown from '../MenuDropdown.vue';
import Shape from './items/shapes/Shape';
import {find, forEach} from '../../collections';
import StoreUtils from '../../store/StoreUtils';
import EditorEventBus from './EditorEventBus';
import { createTemplatePropertyMatcher } from './items/ItemTemplate';

export default {
    props: {
        editorId            : {type: String, required: true},
        schemeContainer     : { type: Object, required: true },
        mode                : { type: String, required: true },    // "edit" or "view"
        state               : { type: String, required: true},
        textSelectionEnabled: {type: Boolean, default: false},
        zoom                : { type: Number, required: true },
        editAllowed         : { type: Boolean, default: false },
        menuOptions         : { type: Array, default: []},
        historyUndoable     : { type: Boolean, required: true},
        historyRedoable     : { type: Boolean, required: true},
        isRecording         : { type: Boolean, required: true},
        isScreenGrabbing    : { type: Boolean, required: true},
        modeControlEnabled  : { type: Boolean, default: true}
    },

    components: {
        AdvancedColorEditor, ColorPicker, StrokePatternDropdown,
        PathCapDropdown, NumberTextfield, MenuDropdown, Dropdown,
        StrokeControl, TextStyleControl
    },

    beforeMount() {
        EditorEventBus.schemeChangeCommitted.$on(this.editorId, this.onSchemeChangeCommitted);
        EditorEventBus.item.selected.any.$on(this.editorId, this.onItemSelectionChanged);
        EditorEventBus.item.deselected.any.$on(this.editorId, this.onItemSelectionChanged);
        EditorEventBus.itemSurround.created.$on(this.editorId, this.onItemSurroundCreated);
    },

    beforeDestroy() {
        EditorEventBus.schemeChangeCommitted.$off(this.editorId, this.onSchemeChangeCommitted);
        EditorEventBus.item.selected.any.$off(this.editorId, this.onItemSelectionChanged);
        EditorEventBus.item.deselected.any.$off(this.editorId, this.onItemSelectionChanged);
        EditorEventBus.itemSurround.created.$off(this.editorId, this.onItemSurroundCreated);
    },

    data() {
        return {
            knownModes: ['view', 'edit'],
            searchKeyword: '',
            searchHighlights: [],

            connectorTypes: ['linear', 'smooth', 'step', 'step-cut', 'step-smooth'],

            zoomOptions: [
                {name: '10%', value: 10},
                {name: '25%', value: 25},
                {name: '35%', value: 35},
                {name: '50%', value: 50},
                {name: '75%', value: 75},
                {name: '100%', value: 100},
                {name: '125%', value: 125},
                {name: '150%', value: 150},
                {name: '200%', value: 200},
                {name: '300%', value: 300},
                {name: '400%', value: 400},
                {name: '500%', value: 500},
                {name: '750%', value: 750},
                {name: '1000%', value: 1000},
            ],

            selectedItemsCount: 0,
            firstSelectedItem: null,

            supportsFill: false,

            // the first item in the selection that supports stroke props
            strokeItem: null,
            // the first item in the selection that has text slots
            textStyleItem: null,

            fillColor: {type: 'solid', color: 'rgba(255,255,255,1.0)'},

            pathSourceCap: 'empty',
            pathDestinationCap: 'empty',

            currentConnectorSmoothing: 'smooth',

            itemSurround: {
                shown: false,
                padding: 20,
                boundingBox: {x: 0, y: 0, w: 0, h: 0, r: 0},
                item: null,
                childItemOriginalPositions: {}
            },

        };
    },

    methods: {
        // this event handler is needed for sitations like change the properties of the templated item
        // in such case the template is regenerated and we need to update the state of all of the buttons and color pickers
        onSchemeChangeCommitted() {
            this.onItemSelectionChanged();
        },
        toggleSnapToGrid(enabled) {
            this.$store.dispatch('setGridSnap', enabled);
        },
        toggleSnapToItems(enabled) {
            this.$store.dispatch('setItemSnap', enabled);
        },

        onItemSelectionChanged() {
            this.itemSurround.shown = false;

            this.selectedItemsCount = this.schemeContainer.getSelectedItems().length;

            let supportsFill = false;
            let strokeItem = null;
            let textStyleItem = null;

            this.schemeContainer.getSelectedItems().forEach((item, idx) => {
                let templatePropMatcher = null;
                if (item.meta.templated) {
                    if (item.args && item.args.templateIgnoredProps) {
                        templatePropMatcher = createTemplatePropertyMatcher(item.args.templateIgnoredProps);
                    } else {
                        // if the templated item does not have ignored props, then it should always return false
                        // so that it can override the support for fill and stroke later
                        templatePropMatcher = () => false;
                    }
                }

                if (idx === 0) {
                    this.firstSelectedItem = item;
                    if (item.shape === 'connector' || item.shape === 'path') {
                        this.pathSourceCap = item.shapeProps.sourceCap;
                        this.pathDestinationCap = item.shapeProps.destinationCap;
                    }
                }
                const shape = Shape.find(item.shape);
                if (!shape) {
                    return;
                }
                if (shape.argType('fill') === 'advanced-color' && !supportsFill) {
                    this.fillColor = item.shapeProps.fill;
                    if (templatePropMatcher) {
                        supportsFill = templatePropMatcher('shapeProps.fill');
                    } else {
                        supportsFill = true;
                    }
                }
                if (shape.argType('strokeColor') === 'color') {
                    if (templatePropMatcher) {
                        if (templatePropMatcher('shapeProps.strokeColor')) {
                            strokeItem = item;
                        }
                    } else {
                        strokeItem = item;
                    }
                }
                if (shape.getTextSlots(item).length > 0) {
                    textStyleItem = item;
                }
            });

            this.supportsFill = supportsFill;
            this.strokeItem = strokeItem;
            this.textStyleItem = textStyleItem;

            if (this.selectedItemsCount > 0 && this.firstSelectedItem.shape === 'connector') {
                this.currentConnectorSmoothing = this.firstSelectedItem.shapeProps.smoothing;
            }
        },

        setConnectorSmoothing(smoothingType) {
            this.currentConnectorSmoothing = smoothingType;
            StoreUtils.setDefaultConnectorSmoothing(this.$store, smoothingType);

            if (this.isCreatingConnector()) {
                this.$store.state.connecting.connectorItem.shapeProps.smoothing = smoothingType;
                EditorEventBus.item.changed.specific.$emit(this.editorId, this.$store.state.connecting.connectorItem.id);
            } else {
                this.emitShapePropChange('smoothing', 'choice', smoothingType);
            }
        },

        isCreatingConnector() {
            return this.state === 'connecting' && this.$store.state.connecting.connectorItem;
        },

        stopDrawing() {
            this.$emit('stop-drawing-requested');
        },

        stopConnecting() {
            this.$emit('stop-connecting-requested');
        },

        removeSelectedItems() {
            if (this.selectedItemsCount === 0) {
                return;
            }
            this.schemeContainer.deleteSelectedItems();
        },

        emitShapePropChange(name, type, value) {
            this.$emit('shape-prop-changed', name, type, value);
            if (name === 'sourceCap') {
                this.pathSourceCap = value;
            }
            else if (name === 'destinationCap') {
                this.pathDestinationCap = value;
            }
        },

        onTextStylePropertyChange(name, value) {
            this.$emit('text-style-prop-change', name, value);
        },

        onItemSurroundCreated(item, boundingBox, padding) {
            this.itemSurround.childItemOriginalPositions = {};
            this.itemSurround.item        = item;
            this.itemSurround.boundingBox = boundingBox;
            this.itemSurround.padding     = padding;
            this.itemSurround.shown       = true;
            forEach(item.childItems, childItem => {
                this.itemSurround.childItemOriginalPositions[childItem.id] = this.schemeContainer.worldPointOnItem(0, 0, childItem);
            });
        },

        onItemSurroundPaddingChanged(padding) {
            const item = this.itemSurround.item;
            if (!item) {
                return;
            }

            this.$store.dispatch('setItemSurroundPadding', padding);

            let parentItem = null;
            if (item.meta.parentId) {
                parentItem = this.schemeContainer.findItemById(item.meta.parentId);
            }

            if (parentItem) {
                const localPoint = this.schemeContainer.localPointOnItem(
                    this.itemSurround.boundingBox.x - padding,
                    this.itemSurround.boundingBox.y - padding,
                    parentItem
                );
                item.area.x = localPoint.x;
                item.area.y = localPoint.y;
                item.area.w = this.itemSurround.boundingBox.w + 2 * padding;
                item.area.h = this.itemSurround.boundingBox.h + 2 * padding;

            } else {
                item.area.x = this.itemSurround.boundingBox.x - padding;
                item.area.y = this.itemSurround.boundingBox.y - padding;
                item.area.w = this.itemSurround.boundingBox.w + 2 * padding;
                item.area.h = this.itemSurround.boundingBox.h + 2 * padding;
            }

            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'area');

            this.schemeContainer.updateEditBox();

            forEach(item.childItems, childItem => {
                const originalWorldPoint = this.itemSurround.childItemOriginalPositions[childItem.id];
                const localPoint = this.schemeContainer.localPointOnItem(originalWorldPoint.x, originalWorldPoint.y, item);
                childItem.area.x = localPoint.x;
                childItem.area.y = localPoint.y;
            });

            this.schemeContainer.updateChildTransforms(item);
            forEach(item.childItems, childItem => {
                EditorEventBus.item.changed.specific.$emit(this.editorId, childItem.id, 'area');
            });
        },

        toggleAutoRemount(event) {
            StoreUtils.toggleAutoRemount(this.$store, event.target.checked);
        },

        togglePivot() {
            StoreUtils.togglePivot(this.$store);
        },

        toggleItemDetailMarkers() {
            StoreUtils.toggleItemDetailMarkers(this.$store);
        },

        toggleClickableMarkers() {
            EditorEventBus.clickableMarkers.toggled.$emit(this.editorId);
        },

        onZoomOutClicked() {
            let selectedZoom = this.zoomOptions[0].value;
            let found = false;
            for (let i = 0; i < this.zoomOptions.length && !found; i++) {
                if (this.zoomOptions[i].value < this.zoom) {
                    selectedZoom = this.zoomOptions[i].value;
                } else {
                    found = true;
                }
            }
            this.changeZoomTo(selectedZoom);
        },

        onZoomInClicked() {
            let selectedZoom = this.zoomOptions[this.zoomOptions.length - 1].value;
            let found = false;
            let i = this.zoomOptions.length - 1;
            while(!found) {
                if (this.zoomOptions[i].value > this.zoom) {
                    selectedZoom = this.zoomOptions[i].value;
                } else {
                    found = true;
                }
                i = i - 1;
                if (i < 0) {
                    found = true;
                }
            }
            this.changeZoomTo(selectedZoom);
        },

        onZoomOptionSelected(option) {
            this.changeZoomTo(option.value);
        },

        changeZoomTo(newZoom) {
            this.$emit('zoom-changed', newZoom);
        },

        onZoomSubmit(event) {
            const zoomText = event.target.value;
            const zoom = parseInt(zoomText);

            if (isNaN(zoom)) {
                return;
            }
            if (zoom > 0) {
                this.changeZoomTo(zoom)
            }
        },

        toggleSearchedItems() {
            EditorEventBus.searchedItemsToggled.$emit(this.editorId);
        },

        toggleTextSelection() {
            this.$emit('text-selection-changed', !this.textSelectionEnabled);
        },

        onStrokeControlCollapsed() {
            EditorEventBus.colorControlToggled.$emit(this.editorId, false);
        },

        onStrokeControlExpanded() {
            EditorEventBus.colorControlToggled.$emit(this.editorId, true);
        }
    },

    watch: {
        searchKeyword(keyword) {
            EditorEventBus.searchKeywordUpdated.$emit(this.editorId, keyword);
        },

        state(state) {
            if (this.isCreatingConnector()) {
                this.currentConnectorSmoothing = this.$store.state.connecting.connectorItem.shapeProps.smoothing;
            }
        },

    },

    computed: {
        rootPath() {
            return this.$store.getters.rootPath;
        },

        assetsPath() {
            return this.$store.getters.assetsPath;
        },

        shouldSnapToGrid() {
            return this.$store.getters.shouldSnapToGrid;
        },

        shouldSnapToItems() {
            return this.$store.getters.shouldSnapToItems;
        },

        shouldShowBaseControls() {
            return this.state !== 'editPath' && this.state !== 'draw' && this.state !== 'connecting';
        },

        isEdittingPath() {
            return this.state === 'editPath';
        },

        isDrawing() {
            return this.state === 'draw';
        },

        shouldShowPathCaps() {
            if (this.state === 'editPath') {
                return true;
            }
            if (this.selectedItemsCount > 0 && (this.firstSelectedItem.shape === 'connector')) {
                return true;
            }
            return false;
        },

        shouldShowConnectorControls() {
            return (this.selectedItemsCount > 0 && this.firstSelectedItem.shape === 'connector') || this.state === 'connecting';
        },

        autoRemount() {
            return this.$store.getters.autoRemount;
        },

        showPivot() {
            return this.$store.getters.showPivot;
        },

        showItemDetailMarkers() {
            return this.$store.getters.showItemDetailMarkers;
        },
    }
}
</script>