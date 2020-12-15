<template>
    <div class="quick-helper-panel-wrapper">
        <div class="quick-helper-panel">
            <div class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <span title="Undo" class="icon-button" :class="{'disabled': !historyUndoable}" @click="$emit('clicked-undo')"><i class="fas fa-undo"></i></span>
                    </li>
                    <li>
                        <span title="Redo" class="icon-button" :class="{'disabled': !historyRedoable}" @click="$emit('clicked-redo')"><i class="fas fa-redo"></i></span>
                    </li>
                    <li>
                        <span title="Show Item List" class="icon-button" @click="$emit('clicked-show-item-list')"><i class="fas fa-list"></i></span>
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
                    <li>
                        <input type="checkbox" :checked="curveEditAutoAttachEnabled" @input="onCurveEditAutoAttachClicked" id="chk-curve-edit-auto-attach"/>
                        <label for="chk-curve-edit-auto-attach"> Auto-Attach</label>
                    </li>
                </ul>
                
            </div>
            <div v-if="currentState === 'editCurve'" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <input type="checkbox" :checked="curveEditAutoAttachEnabled" @input="onCurveEditAutoAttachClicked" id="chk-curve-edit-auto-attach"/>
                        <label for="chk-curve-edit-auto-attach"> Auto-Attach</label>
                    </li>
                    <li>
                        <span @click="stopEditCurve" class="btn btn-small btn-primary">Stop Edit</span>
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
import Shape from './items/shapes/Shape';

export default {
    props: {
        /** @type {SchemeContainer} */
        schemeContainer: { type: Object },
        projectId      : {type: String},
    },
    components: {AdvancedColorEditor, ColorPicker, StrokePatternDropdown},

    beforeMount() {
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionChanged);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionChanged);
    },

    beforeDestroy() {
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionChanged);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionChanged);
    },

    data() {
        return {
            selectedItemsCount: 0,

            fillColor: {type: 'solid', color: 'rgba(255,255,255,1.0)'},
            strokeColor: 'rgba(255,255,255,1.0)',

            strokePattern: 'solid',
        };
    },

    methods: {
        toggleSnapToGrid() {
            this.$store.dispatch('setGridSnap', !this.$store.state.grid.snap);
        },

        onItemSelectionChanged() {
            this.selectedItemsCount = this.schemeContainer.getSelectedItems().length;
            if (this.schemeContainer.getSelectedItems().length > 0) {
                const item = this.schemeContainer.getSelectedItems()[0];
                const shape = Shape.find(item.shape);
                if (shape.argType('fill') === 'advanced-color') {
                    this.fillColor = item.shapeProps.fill;
                }
                if (shape.argType('strokeColor') === 'color') {
                    this.strokeColor = item.shapeProps.strokeColor;
                }
                if (shape.argType('strokePattern') === 'stroke-pattern') {
                    this.strokePattern = item.shapeProps.strokePattern;
                }
            }
        },
        onCurveEditAutoAttachClicked(event) {
            if (event.target.checked) {
                this.$store.dispatch('enableCurveEditAutoAttach');
            } else {
                this.$store.dispatch('disableCurveEditAutoAttach');
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
        },

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
        }
    }
}
</script>