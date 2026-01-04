<template>
    <div class="color-matrix">
        <div class="color-component-selector">
            <div class="ctrl-label">Channel</div>

            <div class="toggle-group">
                <span v-for="component in colorComponents"
                    class="toggle-button"
                    :class="{toggled: currentComponent === component}"
                    @click="currentComponent = component"
                    >{{ component }}</span>
            </div>
        </div>

        <div class="ctrl-label">Channel impact</div>

        <div class="color-component-inputs">
            <div class="color-component-field">
                <span class="label">{{currentComponent}} to red</span>
                <div>
                    <NumberTextfield :min="-200" :max="200" :slider="true" :value="red" @changed="onRedChange"/>
                </div>
            </div>

            <div class="color-component-field">
                <span class="label">{{currentComponent}} to green</span>
                <div>
                    <NumberTextfield :min="-200" :max="200" :slider="true" :value="green" @changed="onGreenChange"/>
                </div>
            </div>

            <div class="color-component-field">
                <span class="label">{{currentComponent}} to blue</span>
                <div>
                    <NumberTextfield :min="-200" :max="200" :slider="true" :value="blue" @changed="onBlueChange"/>
                </div>
            </div>

            <div class="color-component-field">
                <span class="label">{{currentComponent}} to alpha</span>
                <div>
                    <NumberTextfield :min="-200" :max="200" :slider="true" :value="alpha" @changed="onAlphaChange"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import utils from '../../../utils';
import NumberTextfield from '../../NumberTextfield.vue';

const componentToIndex = {
    red: 0,
    green: 1,
    blue: 2,
    alpha: 3
};

export default {
    props: ['matrix'],

    components: {NumberTextfield},

    data() {
        return {
            colorComponents: ['red', 'green', 'blue', 'alpha'],
            currentComponent: 'red',

            red: this.matrix[0][0] * 100,
            green: this.matrix[0][1] * 100,
            blue: this.matrix[0][2] * 100,
            alpha: this.matrix[0][3] * 100,
        };
    },

    methods: {
        selectColorComponent(colorComponent) {
            const i = componentToIndex[colorComponent];
            this.red = this.matrix[i][0] * 100;
            this.green = this.matrix[i][1] * 100;
            this.blue = this.matrix[i][2] * 100;
            this.alpha = this.matrix[i][3] * 100;

            this.$forceUpdate();
        },

        onRedChange(value) {
            this.red = value;
        },
        onGreenChange(value) {
            this.green = value;
        },
        onBlueChange(value) {
            this.blue = value;
        },
        onAlphaChange(value) {
            this.alpha = value;
        },
        onValueChange(id, value) {
            const i = componentToIndex[this.currentComponent];
            const matrix = utils.clone(this.matrix);
            matrix[i][id] = value / 100;
            this.$emit('changed', matrix);
        },
    },

    watch: {
        currentComponent(value) {
            this.selectColorComponent(value);
        },

        red(value) {
            this.onValueChange(0, value);
        },

        green(value) {
            this.onValueChange(1, value);
        },

        blue(value) {
            this.onValueChange(2, value);
        },

        alpha(value) {
            this.onValueChange(3, value);
        },
    }
}
</script>