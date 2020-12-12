<template>
    <div class="quick-helper-panel-wrapper">
        <div class="quick-helper-panel">
            <div class="quick-helper-panel-section">
                <ul class="button-group" :class="{disabled: selectedItemsCount === 0}">
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
                </ul>
                
            </div>
            <div v-if="currentState === 'curve-edit-helper'" class="quick-helper-panel-section">
                <ul class="button-group">
                    <li>
                        <input type="checkbox" :checked="curveEditAutoAttachEnabled" @input="onCurveEditAutoAttachClicked" id="chk-curve-edit-auto-attach"/>
                    </li>
                    <li>
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
import Shape from './items/shapes/Shape';

export default {
    props: {
        /** @type {SchemeContainer} */
        schemeContainer : { value: null, type: Object },
        projectId: {value: null, type: String}
    },
    components: {AdvancedColorEditor, ColorPicker},

    beforeMount() {
        EventBus.$on(EventBus.EDITOR_STATE_CHANGED, this.onEditorStateChanged);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionChanged);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionChanged);
    },

    beforeDestroy() {
        EventBus.$off(EventBus.EDITOR_STATE_CHANGED, this.onEditorStateChanged);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionChanged);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionChanged);
    },

    data() {
        return {
            currentState: null,
            selectedItemsCount: 0,

            fillColor: {type: 'solid', color: 'rgba(255,255,255,1.0)'},
            strokeColor: 'rgba(255,255,255,1.0)'
        };
    },

    methods: {
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
            }
        },
        onCurveEditAutoAttachClicked(event) {
            if (event.target.checked) {
                this.$store.dispatch('enableCurveEditAutoAttach');
            } else {
                this.$store.dispatch('disableCurveEditAutoAttach');
            }
        },

        onEditorStateChanged(stateName) {
            if (stateName === 'edit-curve') {
                this.currentState = 'curve-edit-helper';
            } else {
                this.currentState = null;
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
        },

    },

    computed: {
        curveEditAutoAttachEnabled() {
            return this.$store.getters.curveEditAutoAttachEnabled;
        }
    }
}
</script>