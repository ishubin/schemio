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
                            @export-json-requested="$emit('export-json-requested')"
                            @export-svg-requested="$emit('export-svg-requested')"
                            @export-html-requested="$emit('export-html-requested')"
                            />
                    </li>
                </ul>
            </div>

            <div class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <span title="Undo" class="icon-button" :class="{'disabled': !historyUndoable}" @click="$emit('clicked-undo')"><i class="fas fa-undo"></i></span>
                    </li>
                    <li>
                        <span title="Redo" class="icon-button" :class="{'disabled': !historyRedoable}" @click="$emit('clicked-redo')"><i class="fas fa-redo"></i></span>
                    </li>
                    <li>
                        <span title="Zoom to Selection" class="icon-button" @click="$emit('clicked-zoom-to-selection')"><i class="fas fa-bullseye"></i></span>
                    </li>
                    <li>
                        <span title="Snap to Grid" class="toggle-button" :class="{toggled: snapToGrid}" @click="toggleSnapToGrid()">
                            <i class="fas fa-magnet"></i>
                            <i class="small-letter">G</i>
                        </span>
                    </li>
                </ul>
            </div>
            <div class="quick-helper-panel-section" v-if="selectedItemsCount > 0">
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
            <div class="quick-helper-panel-section" v-if="selectedItemsCount > 0">
                <ul class="button-group">
                    <li>
                        <advanced-color-editor
                            :project-id="projectId"
                            :value="fillColor"
                            width="20px"
                            height="20px"
                            @changed="emitShapePropChange('fill', 'advanced-color', arguments[0])" />
                    </li>
                    <li>
                        <color-picker
                            :color="strokeColor"
                            width="20px"
                            height="20px"
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
                </ul>
                
            </div>
            <div v-if="shouldShownCurveHelpers" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <span class="toggle-button" :class="{toggled: curveEditAutoAttachEnabled}" @click="toggleCurveEditAutoAttach" title="Auto-attach curve">
                            <img src="/assets/images/helper-panel/auto-attach-curve.svg"/>
                        </span>
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
                    <li v-if="currentState === 'editCurve'">
                        <span @click="stopEditCurve" class="btn btn-small btn-primary">Stop Edit</span>
                    </li>
                </ul>
            </div>
            <div v-if="itemSurround.shown" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <number-textfield :value="itemSurround.padding" name="Padding" @changed="onItemSurroundPaddingChanged"/>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>


<script>
import '../../typedef';
import EventBus from './EventBus';
import AdvancedColorEditor from './AdvancedColorEditor.vue';
import ColorPicker from './ColorPicker.vue';
import StrokePatternDropdown from './StrokePatternDropdown.vue';
import CurveCapDropdown from './CurveCapDropdown.vue';
import NumberTextfield from '../NumberTextfield.vue';
import MenuDropdown from '../MenuDropdown.vue';
import Shape from './items/shapes/Shape';
import forEach from 'lodash/forEach';

export default {
    props: {
        /** @type {SchemeContainer} */
        schemeContainer: { type: Object },
        projectId      : {type: String},
    },
    components: {AdvancedColorEditor, ColorPicker, StrokePatternDropdown, CurveCapDropdown, NumberTextfield, MenuDropdown},

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
        return {
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
                {name: 'Export as JSON', event: 'export-json-requested'},
                {name: 'Export as SVG',  event: 'export-svg-requested'},
                {name: 'Export as HTML', event: 'export-html-requested'}
            ],
        };
    },

    methods: {
        toggleSnapToGrid() {
            this.$store.dispatch('setGridSnap', !this.$store.state.grid.snap);
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

        toggleCurveEditAutoAttach() {
            if (this.$store.state.curveEditing.autoAttachEnabled) {
                this.$store.dispatch('disableCurveEditAutoAttach');
            } else {
                this.$store.dispatch('enableCurveEditAutoAttach');
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
            this.schemeContainer.updateAllMultiItemEditBoxes();

            forEach(item.childItems, childItem => {
                const originalWorldPoint = this.itemSurround.childItemOriginalPositions[childItem.id];

                const localPoint = this.schemeContainer.localPointOnItem(originalWorldPoint.x, originalWorldPoint.y, item);
                childItem.area.x = localPoint.x;
                childItem.area.y = localPoint.y;
                EventBus.emitItemChanged(childItem.id, 'item.area');
            });
        }
    },

    computed: {
        curveEditAutoAttachEnabled() {
            return this.$store.getters.curveEditAutoAttachEnabled;
        },

        historyRedoable() {
            return this.$store.state.history.redoable;
        },

        historyUndoable() {
            return this.$store.state.history.undoable;
        },

        snapToGrid() {
            return this.$store.state.grid.snap;
        },

        currentState() {
            return this.$store.state.editorStateName;
        },

        shouldShownCurveHelpers() {
            return this.$store.state.editorStateName === 'editCurve' || this.selectedItemsCount > 0;
        },

        shouldShowCurveCaps() {
            if (this.$store.state.editorStateName === 'editCurve') {
                return true;
            }
            if (this.selectedItemsCount > 0 && this.firstSelectedItem.shape === 'curve') {
                return true;
            }
            return false;
        }
    }
}
</script>