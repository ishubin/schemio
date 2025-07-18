<template>
    <div class="stroke-control">
        <div v-if="supportsStrokeColor"
            class="stroke-control-toggle-button"
            :style="{border: `4px solid ${strokeColor}`}"
            @click="toggleDropdown"
            title="Stroke"
            ></div>
        <div class="stroke-control-dropdown" v-if="toggled">
            <div class="stroke-control-color-container">
                <RawColorPicker v-if="supportsStrokeColor" :color="vuePickerColor" @color-changed="updateColor"/>
            </div>
            <div class="stroke-control-other-controls">
                <div>
                    <NumberTextfield v-if="supportsStrokeSize" name="Size" :value="strokeSize" @changed="onStrokeSizeChange($event)" :min="0"/>
                </div>
                <div class="stroke-control-patterns" v-if="supportsStrokePattern">
                    <div v-for="knownPattern in strokePatterns"
                        class="stroke-control-pattern-option"
                        v-html="knownPattern.html"
                        :class="{selected: knownPattern.name === strokePattern}"
                        @click="selectPattern(knownPattern.name)">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Shape from './items/shapes/Shape';
import RawColorPicker from './RawColorPicker.vue';
import NumberTextfield from '../NumberTextfield.vue';
import {map} from '../../collections';
import StrokePattern from './items/StrokePattern';
import EditorEventBus from './EditorEventBus';

function shapeHasArgument(shape, argName, argType) {
    if (!shape) {
        return false;
    }
    const argDef = Shape.getShapePropDescriptor(shape, argName);
    return argDef !== null && argDef.type === argType;
}

export default {
    props: {
        editorId: {type: String, required: true},
        item: {type: Object, required: true},
    },

    components: {RawColorPicker, NumberTextfield},

    mounted() {
        document.body.addEventListener('click', this.onBodyClick);
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
        EditorEventBus.colorControlToggled.$emit(this.editorId, false);
    },


    data() {
        const props = this.buildProps();

        return {
            toggled: false,

            supportsStrokeColor: props.supportsStrokeColor,
            supportsStrokeSize: props.supportsStrokeSize,
            supportsStrokePattern: props.supportsStrokePattern,

            strokeColor: props.strokeColor,
            strokeSize: props.strokeSize,
            strokePattern: props.strokePattern,

            vuePickerColor: props.strokeColor,

            strokePatterns: this.buildStrokePatterns(props.strokeSize)
        };
    },

    methods: {
        buildProps() {
            const shape = Shape.find(this.item.shape);

            const supportsStrokeColor   = shapeHasArgument(shape, 'strokeColor', 'color');
            const supportsStrokeSize    = shapeHasArgument(shape, 'strokeSize', 'number');
            const supportsStrokePattern = shapeHasArgument(shape, 'strokePattern', 'stroke-pattern');

            let strokeColor = 'rgba(0, 0, 0, 1.0)';
            let strokeSize = 0;
            let strokePattern = null;

            if (supportsStrokeColor) {
                strokeColor = this.item.shapeProps.strokeColor;
            }
            if (supportsStrokeSize) {
                strokeSize = this.item.shapeProps.strokeSize;
            }
            if (supportsStrokePattern) {
                strokePattern = this.item.shapeProps.strokePattern;
            }

            return {
                strokeColor,
                strokeSize,
                strokePattern,
                supportsStrokeColor,
                supportsStrokeSize,
                supportsStrokePattern
            }
        },

        onItemChanged(propertyPath) {
            if (propertyPath === 'shapeProps.strokeColor'
                || propertyPath === 'shapeProps.strokeSize'
                || propertyPath === 'shapeProps.strokePattern') {
                const props = this.buildProps();

                this.strokeColor = props.strokeColor;
                this.strokeSize = props.strokeSize;
                this.strokePattern = props.strokePattern;
                this.vuePickerColor = props.strokeColor;

                this.strokePatterns = this.buildStrokePatterns(Math.max(1, props.strokeSize));

            }
        },

        buildStrokePatterns(strokeSize) {
            return map(StrokePattern.patterns, pattern => {
                return {
                    name: pattern,
                    html: StrokePattern.generateStrokeHtml(pattern, strokeSize, 15, 300, 30)
                };
            })
        },

        toggleDropdown() {
            this.toggled = !this.toggled;
            if (this.toggled) {
                this.$emit('expanded');
            } else {
                this.$emit('collapsed');
            }
        },

        updateColor(color) {
            this.strokeColor = color;
            this.$emit('color-changed', this.strokeColor);
        },

        onStrokeSizeChange(value) {
            this.strokeSize = value;
            this.strokePatterns = this.buildStrokePatterns(Math.max(1, Math.min(this.strokeSize, 10)));
            this.$emit('size-changed', this.strokeSize);
        },

        selectPattern(pattern) {
            this.strokePattern = pattern;
            this.$emit('pattern-changed', pattern);
        },

        onBodyClick(event) {
            if (this.toggled && (!event.target || !event.target.closest('.stroke-control'))) {
                this.toggled = false;
                this.$emit('collapsed');
            }
        }
    }
}
</script>