<template>
    <transition name="floating-helper-panel">
        <div ref="floatingHelperPanel" class="floating-helper-panel" :style="{top: `${posY}px`, left: `${posX}px`}">
            <ul class="button-group">
                <li>
                    <div class="item-name">
                        <input v-if="nameEdited" ref="nameInput" type="text" v-model="itemName" placeholder="Name..." @key.enter="nameEdited = false"/>
                        <span v-else @click="triggerNameEdit">{{item.name}}</span>
                    </div>
                </li>
                <li v-if="item.shape === 'path'">
                    <span class="btn btn-secondary btn-small" @click="editPath">Edit Path</span>
                </li>
                <li v-if="item.shape === 'image'">
                    <span @click="cropImage" class="icon-button" title="Crop image"><i class="fas fa-crop"></i></span>
                </li>
                <li v-if="supportsFill">
                    <advanced-color-editor
                        :value="fillColor"
                        width="18px"
                        height="18px"
                        @changed="updateShapeProp('fill', arguments[0])" />
                </li>
                <li v-if="supportsStroke">
                    <StrokeControl
                        :item="item"
                        @color-changed="updateShapeProp('strokeColor', arguments[0])"
                        @size-changed="updateShapeProp('strokeSize', arguments[0])"
                        @pattern-changed="updateShapeProp('strokePattern', arguments[0])"
                        />
                </li>
                <li>
                    <span class="icon-button" title="Remove" @click="deleteItem()"> <i class="fas fa-trash"></i> </span>
                </li>
            </ul>
        </div>
    </transition>
</template>

<script>
import AdvancedColorEditor from './AdvancedColorEditor.vue';
import StrokeControl from './StrokeControl.vue';
import EventBus from './EventBus';
import Shape from './items/shapes/Shape';

export default {
    props: ['x', 'y', 'item', 'schemeContainer'],

    components: {AdvancedColorEditor, StrokeControl},

    mounted() {
        this.updatePosition();
    },

    data() {
        let fillColor = null;
        let supportsFill = false;
        let supportsStroke = false;
        const shape = Shape.find(this.item.shape);

        if (shape.argType('fill') === 'advanced-color') {
            fillColor = this.item.shapeProps.fill;
            supportsFill = true;
        }
        if (shape.argType('strokeColor') === 'color') {
            supportsStroke = true;
        }

        return {
            fillColor,
            supportsFill,
            supportsStroke,
            posX: this.x,
            posY: this.y,
            nameEdited: false,
            itemName: this.item.name
        }
    },

    methods: {
        emitShapePropChange(name, type, value) {
            this.$emit('shape-prop-changed', name, type, value);
        },

        updatePosition() {
            // const bbRect = this.$refs.floatingHelperPanel.getBoundingClientRect();
            this.posX = this.x;
            this.posY = this.y;
        },

        editPath() {
            EventBus.emitCurveEdited(this.item);
        },

        cropImage() {
            EventBus.$emit(EventBus.IMAGE_CROP_TRIGGERED, this.item);
        },

        updateShapeProp(name, value) {
            this.item.shapeProps[name] = value;
            EventBus.emitItemChanged(this.item.id, `shapeProps.${name}`);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.shapeProps.${name}`);
        },

        deleteItem() {
            this.schemeContainer.deleteSelectedItems();
            EventBus.emitSchemeChangeCommited();
        },

        triggerNameEdit() {
            this.nameEdited = true;
            this.$nextTick(() => {
                this.$refs.nameInput.focus();
            });
        },
    },

    watch: {
        x(value) {
            this.updatePosition();
        },
        y(value) {
            this.updatePosition();
        },

        itemName(value) {
            this.item.name = value;
            EventBus.emitItemChanged(this.item.id, 'name');
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.name`);
        }
    }
}
</script>