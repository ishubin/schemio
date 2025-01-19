<template>
    <div class="color-matrix">
        <div class="color-component-selector">
            <div class="ctrl-label">Channel</div>
            <select v-model="currentComponent">
                <option v-for="component in colorComponents" :value="component">{{component}}</option>
            </select>
        </div>

        <div class="ctrl-label">Channel impact</div>

        <div class="color-component-inputs">
            <div class="color-component-field">
                <span class="label">{{currentComponent}} to red</span>
                <div>
                    <div class="slider-container">
                        <input type="range" min="-200" max="200" v-model="red" class="slider" @input="onSliderChange('red', $event.target.value)"/>
                        <input type="text" :value="redText" class="slider-text" @input="onSliderTextChange('red', $event.target.value)"/>
                    </div>
                </div>
            </div>

            <div class="color-component-field">
                <span class="label">{{currentComponent}} to green</span>
                <div>
                    <div class="slider-container">
                        <input type="range" min="-200" max="200" v-model="green" class="slider" @input="onSliderChange('green', $event.target.value)"/>
                        <input type="text" :value="greenText" class="slider-text" @input="onSliderTextChange('green', $event.target.value)"/>
                    </div>
                </div>
            </div>

            <div class="color-component-field">
                <span class="label">{{currentComponent}} to blue</span>
                <div>
                    <div class="slider-container">
                        <input type="range" min="-200" max="200" v-model="blue" class="slider" @input="onSliderChange('blue', $event.target.value)"/>
                        <input type="text" :value="blueText" class="slider-text" @input="onSliderTextChange('blue', $event.target.value)"/>
                    </div>
                </div>
            </div>

            <div class="color-component-field">
                <span class="label">{{currentComponent}} to alpha</span>
                <div>
                    <div class="slider-container">
                        <input type="range" min="-200" max="200" v-model="alpha" class="slider" @input="onSliderChange('alpha', $event.target.value)"/>
                        <input type="text" :value="alphaText" class="slider-text" @input="onSliderTextChange('alpha', $event.target.value)"/>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import myMath from '../../../myMath';
import utils from '../../../utils';

const componentToIndex = {
    red: 0,
    green: 1,
    blue: 2,
    alpha: 3
};

export default {
    props: ['matrix'],

    components: {},

    data() {
        return {
            colorComponents: ['red', 'green', 'blue', 'alpha'],
            currentComponent: 'red',

            red: this.matrix[0][0] * 100,
            green: this.matrix[0][1] * 100,
            blue: this.matrix[0][2] * 100,
            alpha: this.matrix[0][3] * 100,

            redText: this.matrix[0][0],
            greenText: this.matrix[0][1],
            blueText: this.matrix[0][2],
            alphaText: this.matrix[0][3],
        };
    },

    methods: {
        selectColorComponent(colorComponent) {
            const i = componentToIndex[colorComponent];
            this.red = this.matrix[i][0] * 100;
            this.green = this.matrix[i][1] * 100;
            this.blue = this.matrix[i][2] * 100;
            this.alpha = this.matrix[i][3] * 100;

            this.redText = this.red / 100;
            this.greenText = this.green / 100;
            this.blueText = this.blue / 100;
            this.alphaText = this.alpha / 100;
            this.$forceUpdate();
        },

        onValueChange(id, value) {
            const i = componentToIndex[this.currentComponent];
            const matrix = utils.clone(this.matrix);
            matrix[i][id] = value / 100;
            this.$emit('changed', matrix);
        },

        onSliderTextChange(colorComponent, text) {
            let number = parseFloat(text);
            if (isNaN(number)) {
                number = 0;
            }
            const value = myMath.clamp(number, -2, 2);
            if (colorComponent === 'red') {
                this.red = value * 100;
                this.redText = text;
            } else if (colorComponent === 'green') {
                this.green = value * 100;
                this.greenText = text;
            } else if (colorComponent === 'blue') {
                this.blue = value * 100;
                this.blueText = text;
            } else if (colorComponent === 'alpha') {
                this.alpha = value * 100;
                this.alphaText = text;
            }
        },

        onSliderChange(colorComponent, value) {
            if (colorComponent === 'red') {
                this.redText = value / 100;
            } else if (colorComponent === 'green') {
                this.greenText = value / 100;
            } else if (colorComponent === 'blue') {
                this.blueText = value / 100;
            } else if (colorComponent === 'alpha') {
                this.alphaText = value / 100;
            }
        }
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