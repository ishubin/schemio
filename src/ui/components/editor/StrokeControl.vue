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
                <color-picker v-if="supportsStrokeColor" v-model="vuePickerColor" @input="updateColor"/>
            </div>
            <div class="stroke-control-other-controls">
                <div>
                    <NumberTextfield v-if="supportsStrokeSize" name="Size" :value="strokeSize" @changed="onStrokeSizeChange(arguments[0])" :min="0"/>
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
import VueColor from 'vue-color';
import NumberTextfield from '../NumberTextfield.vue';
import map from 'lodash/map';
import StrokePattern from './items/StrokePattern';
import EventBus from './EventBus';

function shapeHasArgument(shape, argName, argType) {
    const argDef = Shape.getShapePropDescriptor(shape, argName);
    return argDef !== null && argDef.type === argType;
}

export default {
    props: {
        item: {type: Object, required: true},
    },

    components: {'color-picker': VueColor.Sketch, NumberTextfield},

    mounted() {
        document.body.addEventListener('click', this.onBodyClick);
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
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

            vuePickerColor: {hex: props.strokeColor},

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
                this.vuePickerColor.hex = props.strokeColor;

                this.strokePatterns = this.buildStrokePatterns(props.strokeSize);

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
        },

        updateColor(color) {
            this.strokeColor = `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${color.rgba.a})`;
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
            if (!event.target || !event.target.closest('.stroke-control')) {
                this.toggled = false;
            }
        }
    }
}
</script>