<template>
    <div class="quick-helper-panel-wrapper">
        <div class="quick-helper-panel">
            <div class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <menu-dropdown 
                            name=""
                            icon-class="fas fa-bars"
                            :options="menuDropdownOptions"
                            @new-scheme-requested="$emit('new-scheme-requested')"
                            @import-json-requested="$emit('import-json-requested')"
                            @export-json-requested="$emit('export-json-requested')"
                            @export-embedded-requested="$emit('export-embedded-requested')"
                            @export-svg-requested="$emit('export-svg-requested')"
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
                            <dropdown :options="zoomOptions" :hover-effect="false" :search-enabled="false" @selected="onZoomOptionSelected">
                                <input :value="zoom" @keydown.enter="onZoomSubmit"/>
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
                    <li>
                        <advanced-color-editor
                            :project-id="projectId"
                            :value="fillColor"
                            width="18px"
                            height="18px"
                            @changed="emitShapePropChange('fill', 'advanced-color', arguments[0])" />
                    </li>
                    <li>
                        <color-picker
                            :color="strokeColor"
                            width="18px"
                            height="18px"
                            :hollow="true"
                            @input="emitShapePropChange('strokeColor', 'color', arguments[0])"></color-picker>
                    </li>
                    <li>
                        <stroke-pattern-dropdown
                            :value="strokePattern"
                            width="50px"
                            height="16px"
                            @selected="emitShapePropChange('strokePattern', 'stroke-pattern', arguments[0])"/>
                    </li>
                    <li v-if="shouldShowCurveCaps">
                        <curve-cap-dropdown 
                            :value="curveSourceCap"
                            :is-source="true"
                            width="16px"
                            height="16px"
                            @selected="emitShapePropChange('sourceCap', 'curve-cap', arguments[0])"/>
                    </li>
                    <li v-if="shouldShowCurveCaps">
                        <curve-cap-dropdown 
                            :value="curveDestinationCap"
                            :is-source="false"
                            width="16px"
                            height="16px"
                            @selected="emitShapePropChange('destinationCap', 'curve-cap', arguments[0])"/>
                    </li>
                </ul>
            </div>
            <div class="quick-helper-panel-section" v-if="mode === 'edit' && shouldShowConnectorControls">
                <ul class="button-group">
                    <li>
                        <span class="icon-button" :class="{'dimmed': currentConnectorSmoothing != 'linear'}" title="Linear" @click="emitShapePropChange('smoothing', 'choice', 'linear')">
                            <img src="/assets/images/helper-panel/connector-linear.svg"/>
                        </span>
                    </li>
                    <li>
                        <span class="icon-button" :class="{'dimmed': currentConnectorSmoothing != 'smooth'}" title="Smooth" @click="emitShapePropChange('smoothing', 'choice', 'smooth')">
                            <img src="/assets/images/helper-panel/connector-smooth.svg"/>
                        </span>
                    </li>
                </ul>
            </div>
            <div v-if="mode === 'edit' && shouldShownCurveHelpers" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li v-if="firstSelectedCurveEditPoint">
                        <span class="icon-button" :class="{'dimmed': firstSelectedCurveEditPoint.t != 'L'}" title="Simple" @click="$emit('convert-curve-points-to-simple')">
                            <img src="/assets/images/helper-panel/curve-point-simple.svg"/>
                        </span>
                    </li>
                    <li v-if="firstSelectedCurveEditPoint">
                        <span class="icon-button" :class="{'dimmed': firstSelectedCurveEditPoint.t != 'B'}" title="Simple" @click="$emit('convert-curve-points-to-beizer')">
                            <img src="/assets/images/helper-panel/curve-point-beizer.svg"/>
                        </span>
                    </li>
                    <li>
                        <span @click="stopEditCurve" class="btn btn-small btn-primary">Stop Edit</span>
                    </li>
                </ul>
            </div>
            <div v-if="mode === 'edit' && currentState === 'createItem'" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <input type="checkbox" title="Automatically mount items into other items"
                            id="item-creating-auto-remount"
                            :checked="itemCreatingAutoRemount"
                            @change="onItemCreatingAutoRemountChange"/>
                        <label for="item-creating-auto-remount">Auto Remount</label>
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
import AdvancedColorEditor from './AdvancedColorEditor.vue';
import ColorPicker from './ColorPicker.vue';
import StrokePatternDropdown from './StrokePatternDropdown.vue';
import CurveCapDropdown from './CurveCapDropdown.vue';
import NumberTextfield from '../NumberTextfield.vue';
import MenuDropdown from '../MenuDropdown.vue';
import Shape from './items/shapes/Shape';
import forEach from 'lodash/forEach';
import StoreUtils from '../../store/StoreUtils';

export default {
    props: {
        /** @type {SchemeContainer} */
        schemeContainer: { type: Object, required: true },
        projectId      : { type: String  },
        project        : { type: Object  },
        mode           : { type: String, required: true }, // "edit" or "view"
        zoom           : { type: Number, required: true },
        editAllowed    : { type: Boolean, default: false }
    },

    components: {
        AdvancedColorEditor, ColorPicker, StrokePatternDropdown,
        CurveCapDropdown, NumberTextfield, MenuDropdown, Dropdown
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
        let newSchemeDisabled = false;
        if (this.project && !this.project.permissions.write) {
            newSchemeDisabled = true;
        }

        return {
            knownModes: ['view', 'edit'],
            searchKeyword: '',
            searchHighlights: [],

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

            fillColor: {type: 'solid', color: 'rgba(255,255,255,1.0)'},
            strokeColor: 'rgba(255,255,255,1.0)',

            curveSourceCap: 'empty',
            curveDestinationCap: 'empty',

            strokePattern: 'solid',

            itemSurround: {
                shown: false,
                padding: 20,
                boundingBox: {x: 0, y: 0, w: 0, h: 0, r: 0},
                item: null,
                childItemOriginalPositions: {}
            },

            menuDropdownOptions: [
                {name: 'New scheme',     event: 'new-scheme-requested', disabled: newSchemeDisabled}, 
                {name: 'Import scheme',  event: 'import-json-requested'},
                {name: 'Export as embedded iframe', event: 'export-embedded-requested'},
                {name: 'Export as JSON', event: 'export-json-requested'},
                {name: 'Export as SVG',  event: 'export-svg-requested'},
                {name: 'Export as HTML', event: 'export-html-requested'}
            ],
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
                if (shape.argType('fill') === 'advanced-color') {
                    this.fillColor = item.shapeProps.fill;
                }
                if (shape.argType('strokeColor') === 'color') {
                    this.strokeColor = item.shapeProps.strokeColor;
                }
                if (shape.argType('strokePattern') === 'stroke-pattern') {
                    this.strokePattern = item.shapeProps.strokePattern;
                }

                if (item.shape === 'curve') {
                    this.curveSourceCap = item.shapeProps.sourceCap;
                    this.curveDestinationCap = item.shapeProps.destinationCap;
                }
            }
        },

        stopEditCurve() {
            EventBus.$emit(EventBus.CURVE_EDIT_STOPPED);
        },
        
        removeSelectedItems() {
            if (this.selectedItemsCount === 0) {
                return;
            }
            this.schemeContainer.deleteSelectedItems();
        },

        emitShapePropChange(name, type, value) {
            this.$emit('shape-prop-changed', name, type, value);
            if (name === 'strokePattern' && type === 'stroke-pattern') {
                this.strokePattern = value;
            }
            else if (name === 'sourceCap') {
                this.curveSourceCap = value;
            }
            else if (name === 'destinationCap') {
                this.curveDestinationCap = value;
            }
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

            item.area.x = this.itemSurround.boundingBox.x - padding;
            item.area.y = this.itemSurround.boundingBox.y - padding;
            item.area.w = this.itemSurround.boundingBox.w + 2 * padding;
            item.area.h = this.itemSurround.boundingBox.h + 2 * padding;

            EventBus.emitItemChanged(item.id, 'item.area');
            this.schemeContainer.updateMultiItemEditBox();

            forEach(item.childItems, childItem => {
                const originalWorldPoint = this.itemSurround.childItemOriginalPositions[childItem.id];

                const localPoint = this.schemeContainer.localPointOnItem(originalWorldPoint.x, originalWorldPoint.y, item);
                childItem.area.x = localPoint.x;
                childItem.area.y = localPoint.y;
                EventBus.emitItemChanged(childItem.id, 'item.area');
            });
        },

        onItemCreatingAutoRemountChange(event) {
            StoreUtils.setItemCreatingAutoRemount(this.$store, event.target.checked);
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
    },

    computed: {
        currentUser() {
            return this.$store.getters.currentUser;
        },

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

        currentState() {
            return this.$store.state.editorStateName;
        },

        shouldShownCurveHelpers() {
            return this.$store.state.editorStateName === 'editCurve';
        },

        shouldShowCurveCaps() {
            if (this.$store.state.editorStateName === 'editCurve') {
                return true;
            }
            if (this.selectedItemsCount > 0 && this.firstSelectedItem.shape === 'connector' || this.firstSelectedItem.shape === 'curve') {
                return true;
            }
            return false;
        },

        shouldShowConnectorControls() {
            return this.selectedItemsCount > 0 && this.firstSelectedItem.shape === 'connector';
        },

        currentConnectorSmoothing() {
            if (this.selectedItemsCount > 0 && this.firstSelectedItem.shape === 'connector') {
                return this.firstSelectedItem.shapeProps.smoothing;
            }
            return '';
        },

        itemCreatingAutoRemount() {
            return this.$store.getters.itemCreatingAutoRemount;
        },

        firstSelectedCurveEditPoint() {
            return this.$store.getters.firstSelectedCurveEditPoint;
        },
    }
}
</script>