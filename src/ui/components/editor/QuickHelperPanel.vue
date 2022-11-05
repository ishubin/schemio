<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="quick-helper-panel-wrapper text-nonselectable">
        <div class="quick-helper-panel">
            <div class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <menu-dropdown
                            name=""
                            icon-class="fas fa-bars"
                            :options="menuDropdownOptions"
                            @export-embedded-requested="$emit('export-embedded-requested')"
                            @export-html-requested="$emit('export-html-requested')"
                            />
                    </li>
                </ul>
            </div>

            <div class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <span title="Zoom to Selection" class="icon-button" @click="$emit('clicked-zoom-to-selection')"><i class="fas fa-bullseye"></i></span>
                    </li>
                    <li>
                        <div class="zoom-control">
                            <span class="zoom-button zoom-out" @click="onZoomOutClicked"><i class="fas fa-search-minus"></i></span>
                            <dropdown :options="zoomOptions" :inline="true" :hover-effect="false" :search-enabled="false" @selected="onZoomOptionSelected">
                                <input :value="zoom" @keydown.enter="onZoomSubmit" style="min-width: 80px; padding-left: 1px; padding-right: 1px;"/>
                            </dropdown>
                            <span class="zoom-button zoom-in" @click="onZoomInClicked"><i class="fas fa-search-plus"></i></span>
                        </div>
                    </li>
                    <li>
                        <input class="textfield" style="width: 150px;" type="text" v-model="searchKeyword" placeholder="Search..."  v-on:keydown.enter="toggleSearchedItems"/>
                        <span v-if="searchKeyword" class="link" @click="searchKeyword = ''">Reset search</span>
                    </li>
                    <li v-if="editAllowed">
                        <div class="toggle-group">
                            <span v-for="knownMode in knownModes" class="toggle-button"
                                :class="['mode-' + knownMode, mode===knownMode?'toggled':'']"
                                @click="$emit('mode-changed', knownMode)"
                                >
                                <i v-if="knownMode === 'edit'" class="fas fa-edit"></i>
                                <i v-if="knownMode === 'view'" class="fas fa-eye"></i>
                                {{knownMode}}
                            </span>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="quick-helper-panel-section" v-if="mode === 'view'">
                <ul class="button-group">
                    <li>
                        <span title="Toggle clickable items" class="toggle-button" :class="{toggled: showClickableMarkers}" @click="toggleClickableMarkers(!showClickableMarkers)">
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

            <div class="quick-helper-panel-section" v-if="mode === 'edit'">
                <ul class="button-group">
                    <li>
                        <span title="Undo" class="icon-button" :class="{'disabled': !historyUndoable}" @click="$emit('clicked-undo')"><i class="fas fa-undo"></i></span>
                    </li>
                    <li>
                        <span title="Redo" class="icon-button" :class="{'disabled': !historyRedoable}" @click="$emit('clicked-redo')"><i class="fas fa-redo"></i></span>
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
            <div class="quick-helper-panel-section" v-if="mode === 'edit' && selectedItemsCount > 0">
                <ul class="button-group">
                    <li>
                        <span class="icon-button" title="Remove" @click="removeSelectedItems()"> <i class="fas fa-trash"></i> </span>
                    </li>
                    <li>
                        <span class="icon-button" title="Bring To Front" @click="$emit('clicked-bring-to-front')">
                            <img src="/assets/images/helper-panel/bring-to-front.svg"/>
                        </span>
                    </li>
                    <li>
                        <span class="icon-button" title="Bring To Back" @click="$emit('clicked-bring-to-back')">
                            <img src="/assets/images/helper-panel/bring-to-back.svg"/>
                        </span>
                    </li>
                </ul>
            </div>
            <div class="quick-helper-panel-section" v-if="mode === 'edit' && selectedItemsCount > 0">
                <ul class="button-group">
                    <li v-if="supportsFill">
                        <advanced-color-editor
                            :value="fillColor"
                            width="18px"
                            height="18px"
                            @changed="emitShapePropChange('fill', 'advanced-color', arguments[0])" />
                    </li>
                    <li v-if="firstSelectedItem">
                        <StrokeControl
                            :key="`stroke-control-${firstSelectedItem.id}-${firstSelectedItem.shape}`"
                            :item="firstSelectedItem"
                            @color-changed="emitShapePropChange('strokeColor', 'color', arguments[0])"
                            @size-changed="emitShapePropChange('strokeSize', 'number', arguments[0])"
                            @pattern-changed="emitShapePropChange('strokePattern', 'stroke-pattern', arguments[0])"
                            />
                    </li>
                    <li v-if="firstSelectedItem">
                        <TextStyleControl
                            :key="`text-style-control-${firstSelectedItem.id}-${firstSelectedItem.shape}`"
                            :item="firstSelectedItem"
                            @property-changed="onTextStylePropertyChange"
                            />
                    </li>
                    <li v-if="shouldShowPathCaps">
                        <path-cap-dropdown
                            :key="`qhp-path-cap-source-${firstSelectedItem.meta.revision}`"
                            :value="pathSourceCap"
                            :is-source="true"
                            :is-fat="firstSelectedItem.shape === 'connector' && firstSelectedItem.shapeProps.fat"
                            width="16px"
                            :height="15"
                            @selected="emitShapePropChange('sourceCap', 'path-cap', arguments[0])"/>
                    </li>
                    <li v-if="shouldShowPathCaps">
                        <path-cap-dropdown
                            :key="`qhp-path-cap-destination-${firstSelectedItem.meta.revision}`"
                            :value="pathDestinationCap"
                            :is-source="false"
                            :is-fat="firstSelectedItem.shape === 'connector' && firstSelectedItem.shapeProps.fat"
                            width="16px"
                            :height="15"
                            @selected="emitShapePropChange('destinationCap', 'path-cap', arguments[0])"/>
                    </li>
                </ul>
            </div>
            <div class="quick-helper-panel-section" v-if="mode === 'edit' && shouldShowConnectorControls">
                <ul class="button-group">
                    <li v-for="connectorType in connectorTypes">
                        <span class="icon-button" :class="{'dimmed': currentConnectorSmoothing != connectorType}" :title="connectorType" @click="setConnectorSmoothing(connectorType)">
                            <img :src="`/assets/images/helper-panel/connector-${connectorType}.svg`"/>
                        </span>
                    </li>
                </ul>
            </div>

            <div v-if="mode === 'edit' && shouldShowPathHelpers" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li v-if="firstSelectedPathEditPoint">
                        <span class="icon-button" :class="{'dimmed': firstSelectedPathEditPoint.t != 'L'}" title="Simple" @click="$emit('convert-path-points-to-simple')">
                            <img src="/assets/images/helper-panel/path-point-simple.svg"/>
                        </span>
                    </li>
                    <li v-if="firstSelectedPathEditPoint">
                        <span class="icon-button" :class="{'dimmed': firstSelectedPathEditPoint.t != 'B'}" title="Simple" @click="$emit('convert-path-points-to-bezier')">
                            <img src="/assets/images/helper-panel/path-point-bezier.svg"/>
                        </span>
                    </li>
                    <li>
                        <span @click="stopEditCurve" class="btn btn-small btn-primary">Stop Edit</span>
                    </li>
                </ul>
            </div>

            <div v-if="mode === 'edit' && shouldShowDrawHelpers" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <number-textfield :value="drawEpsilon" name="Optimization" @changed="onDrawEpsilonChanged" :min="1" :max="1000"/>
                    </li>
                    <li>
                        <span @click="stopDrawing" class="btn btn-small btn-primary">Stop Drawing</span>
                    </li>
                </ul>
            </div>


            <div v-if="mode === 'edit'" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <input type="checkbox" title="Automatically mount items into other items"
                            id="chk-auto-remount"
                            :checked="autoRemount"
                            :disabled="animationEditorIsRecording"
                            @change="onAutoRemountChange"/>
                        <label for="chk-auto-remount" title="Automatically mount items into other items">Auto mount</label>
                    </li>
                </ul>
            </div>
            <div v-if="mode === 'edit'" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <input type="checkbox" title="Show pivot point handler"
                            id="chk-show-pivot"
                            :checked="showPivot"
                            @change="onShowPivotChange"/>
                        <label for="chk-show-pivot" title="Show pivot point handler">Pivot</label>
                    </li>
                </ul>
            </div>
            <div v-if="mode === 'edit' && itemSurround.shown" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <number-textfield :value="itemSurround.padding" name="Padding" @changed="onItemSurroundPaddingChanged"/>
                    </li>
                </ul>
            </div>
            <div class="quick-helper-panel-section">
                <slot></slot>
            </div>
        </div>
    </div>
</template>


<script>
import '../../typedef';
import EventBus from './EventBus';
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
import forEach from 'lodash/forEach';
import StoreUtils from '../../store/StoreUtils';

export default {
    props: {
        /** @type {SchemeContainer} */
        schemeContainer     : { type: Object, required: true },
        mode                : { type: String, required: true },    // "edit" or "view"
        state               : { type: String, required: true},
        textSelectionEnabled: {type: Boolean, default: false},
        zoom                : { type: Number, required: true },
        editAllowed         : { type: Boolean, default: false },
        isStaticEditor      : { type: Boolean, default: false},
        menuOptions         : { type: Array, default: []},
    },

    components: {
        AdvancedColorEditor, ColorPicker, StrokePatternDropdown,
        PathCapDropdown, NumberTextfield, MenuDropdown, Dropdown,
        StrokeControl, TextStyleControl
    },

    beforeMount() {
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionChanged);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionChanged);
        EventBus.$on(EventBus.ITEM_SURROUND_CREATED, this.onItemSurroundCreated);
    },

    beforeDestroy() {
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionChanged);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionChanged);
        EventBus.$off(EventBus.ITEM_SURROUND_CREATED, this.onItemSurroundCreated);
    },

    data() {
        const eventCallback = (event) => {return () => {this.$emit(event)}};

        //TODO move it all the way to the top vue component. Electron has to implement it differently
        const defaultMenuDropDownOptions = [
            {name: 'Apply patch',       callback: eventCallback('apply-patch-requested'), iconClass: 'fas fa-file-import'},
            {name: 'Export as JSON',    callback: eventCallback('export-json-requested'), iconClass: 'fas fa-file-export'},
            {name: 'Export as SVG',     callback: eventCallback('export-svg-requested'),  iconClass: 'fas fa-file-export'},
            {name: 'Export as PNG',     callback: eventCallback('export-png-requested'),  iconClass: 'fas fa-file-export'},
            {name: 'Export as link',    callback: eventCallback('export-link-requested'), iconClass: 'fas fa-file-export'},
            {name: 'Export as HTML',    callback: eventCallback('export-html-requested'), iconClass: 'fas fa-file-export'}
        ];

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

            menuDropdownOptions: defaultMenuDropDownOptions.concat(this.menuOptions),

        };
    },

    methods: {
        toggleSnapToGrid(enabled) {
            this.$store.dispatch('setGridSnap', enabled);
        },
        toggleSnapToItems(enabled) {
            this.$store.dispatch('setItemSnap', enabled);
        },

        onItemSelectionChanged() {
            this.itemSurround.shown = false;

            this.selectedItemsCount = this.schemeContainer.getSelectedItems().length;
            if (this.schemeContainer.getSelectedItems().length > 0) {
                const item = this.schemeContainer.getSelectedItems()[0];
                const shape = Shape.find(item.shape);
                this.firstSelectedItem = item;
                if (shape && shape.argType('fill') === 'advanced-color') {
                    this.fillColor = item.shapeProps.fill;
                    this.supportsFill = true;
                } else {
                    this.supportsFill = false;
                }

                if (item.shape === 'connector' || item.shape === 'path') {
                    this.pathSourceCap = item.shapeProps.sourceCap;
                    this.pathDestinationCap = item.shapeProps.destinationCap;
                }
            }

            if (this.selectedItemsCount > 0 && this.firstSelectedItem.shape === 'connector') {
                this.currentConnectorSmoothing = this.firstSelectedItem.shapeProps.smoothing;
            }
        },

        setConnectorSmoothing(smoothingType) {
            this.currentConnectorSmoothing = smoothingType;
            StoreUtils.setDefaultConnectorSmoothing(this.$store, smoothingType);

            if (this.isCreatingConnector()) {
                this.$store.state.connecting.connectorItem.shapeProps.smoothing = smoothingType;
                EventBus.emitItemChanged(this.$store.state.connecting.connectorItem.id);
            } else {
                this.emitShapePropChange('smoothing', 'choice', smoothingType);
            }
        },

        isCreatingConnector() {
            return this.state === 'connecting' && this.$store.state.connecting.connectorItem;
        },

        stopEditCurve() {
            EventBus.$emit(EventBus.CURVE_EDIT_STOPPED);
        },

        stopDrawing() {
            EventBus.$emit(EventBus.STOP_DRAWING);
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

            EventBus.emitItemChanged(item.id, 'area');

            this.schemeContainer.updateMultiItemEditBox();

            forEach(item.childItems, childItem => {
                const originalWorldPoint = this.itemSurround.childItemOriginalPositions[childItem.id];

                const localPoint = this.schemeContainer.localPointOnItem(originalWorldPoint.x, originalWorldPoint.y, item);
                childItem.area.x = localPoint.x;
                childItem.area.y = localPoint.y;
                EventBus.emitItemChanged(childItem.id, 'area');
            });
        },

        onAutoRemountChange(event) {
            StoreUtils.setAutoRemount(this.$store, event.target.checked);
        },

        onShowPivotChange(event) {
            StoreUtils.setShowPivot(this.$store, event.target.checked);
        },

        toggleClickableMarkers(shown) {
            if (shown) {
                EventBus.$emit(EventBus.CLICKABLE_MARKERS_TOGGLED);
            }
            StoreUtils.setShowClickableMarkers(this.$store, shown);
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
            // calculating old center of the scheme

            let schemeContainer = this.schemeContainer;
            const xo = schemeContainer.screenTransform.x;
            const yo = schemeContainer.screenTransform.y;

            const svgRect = document.getElementById('svg_plot').getBoundingClientRect();
            const cx = svgRect.width / 2;
            const cy = svgRect.height / 2;

            const nz = newZoom / 100;

            const sx = cx - nz * (cx - xo) / schemeContainer.screenTransform.scale;
            const sy = cy - nz * (cy - yo) / schemeContainer.screenTransform.scale;

            schemeContainer.screenTransform.scale = nz;

            schemeContainer.screenTransform.x = sx;
            schemeContainer.screenTransform.y = sy;
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
            this.$emit('zoomed-to-items', this.searchHighlights);
        },

        onDrawEpsilonChanged(value) {
            this.$store.dispatch('updateDrawEpsilon', value);
        },

        toggleTextSelection() {
            this.$emit('text-selection-changed', !this.textSelectionEnabled);
        }
    },

    watch: {
        searchKeyword(keyword) {
            keyword = keyword.trim().toLowerCase();

            if (keyword.length > 0) {
                const highlightedItemIds = [];
                let filteredItems = [];
                forEach(this.schemeContainer.getItems(), item => {
                    let shouldHighlight = false;

                    if (this.mode === 'view' && this.schemeContainer.isItemInHUD(item)) {
                        //ignoring item highlight for HUD elements in view mode
                        return;
                    }

                    var name = item.name || '';
                    if (name.toLowerCase().indexOf(keyword) >= 0) {
                        shouldHighlight = true;
                    } else {
                        //search in tags
                        if (item.tags && item.tags.length > 0) {
                            if (find(item.tags, tag => tag.toLowerCase().indexOf(keyword) >= 0)) {
                                shouldHighlight = true;
                            }
                        }
                    }
                    if (shouldHighlight) {
                        filteredItems.push(item);
                        highlightedItemIds.push(item.id);
                    }
                });
                this.searchHighlights = filteredItems;
                EventBus.emitItemsHighlighted(highlightedItemIds);
            } else {
                this.searchHighlights = [];
                EventBus.emitItemsHighlighted([]);
            }
        },

        state(state) {
            if (this.isCreatingConnector()) {
                this.currentConnectorSmoothing = this.$store.state.connecting.connectorItem.shapeProps.smoothing;
            }
        },

    },

    computed: {
        historyRedoable() {
            return this.$store.state.history.redoable;
        },

        historyUndoable() {
            return this.$store.state.history.undoable;
        },

        shouldSnapToGrid() {
            return this.$store.getters.shouldSnapToGrid;
        },

        shouldSnapToItems() {
            return this.$store.getters.shouldSnapToItems;
        },

        shouldShowPathHelpers() {
            return this.state === 'editPath';
        },

        shouldShowDrawHelpers() {
            return this.state === 'draw';
        },

        shouldShowPathCaps() {
            if (this.state === 'editPath') {
                return true;
            }
            if (this.selectedItemsCount > 0 && (this.firstSelectedItem.shape === 'connector' || this.firstSelectedItem.shape === 'path')) {
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

        showClickableMarkers() {
            return this.$store.getters.showClickableMarkers;
        },

        firstSelectedPathEditPoint() {
            return this.$store.getters.firstSelectedCurveEditPoint;
        },

        drawEpsilon() {
            return this.$store.getters.drawEpsilon;
        },

        animationEditorIsRecording() {
            return this.$store.getters.animationEditorIsRecording;
        }
    }
}
</script>