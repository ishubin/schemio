<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="number-textfield-container" :class="{disabled: disabled, 'slider-textfield': isSlider}">
        <div v-if="name" class="label" ref="label" @click="onLabelClicked">{{name}}</div>
        <div v-if="!name && icon" class="label" ref="icon"><i :class="icon"></i></div>
        <div class="wrapper">
            <input v-if="isSlider" class="slider" type="range" v-model="sliderValue" @input="onSliderInput" :min="min" :max="sliderMax" :disabled="disabled" :step="step"/>

            <div class="input-wrapper">
                <input ref="textfield" type="text" v-model="text" @keydown="delaySubmit" @keydown.enter="submitEvent" :disabled="disabled"/>

                <div class="step-controls">
                    <span class="step step-up" @click="onStepClicked(1)" @mousedown="onMouseDownIncrement"><i class="fas fa-caret-up"></i></span>
                    <span class="step step-down" @click="onStepClicked(-1)" @mousedown="onMouseDownDecrement"><i class="fas fa-caret-down"></i></span>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import { createDelayer } from '../delayer';
import myMath from '../myMath';

function numberToText(value) {
    if (value % 1 === 0) {
        return '' + value;
    }

    let text = '';
    if (Math.floor(Math.abs(value)) > 0) {
        text = '' + myMath.roundPrecise(value, 3);
    } else {
        text = '' + myMath.roundPrecise(value, 4);
    }
    return text;
}

export default {
    props: {
        value                : [Number, String, Object],
        format               : {type: String, default: 'float'},
        name                 : {type: String, default: null},
        icon                 : {type: String, default: null},
        slider               : {type: Boolean, default: false},
        min                  : {type: Number, default: null},
        max                  : {type: Number, default: null},
        softMax              : {type: Number, default: null},
        disabled             : {type: Boolean, default: false},
        step                 : {type: Number, default: 1},
        incrementSpeed       : {type: Number, default: 1},
        incrementMaxSpeed    : {type: Number, default: 50},
        incrementAcceleration: {type: Number, default: 0.15}
    },

    beforeDestroy() {
        document.body.removeEventListener('mouseup', this.onMouseUp);
    },

    data() {
        return {
            text: numberToText(this.value),
            number: parseFloat(this.value),
            updateDelayer: createDelayer(100, () => {
                this.submitEvent();
            }),

            sliderValue: parseFloat(this.value),

            autoIncrementDelayTimeoutId: -1,
            autoIncrementDirection: 1,
            autoIncrementInitDelay: 300,
            autoIncrementDelay: 50,
            autoIncrementIntervalId: -1,
            autoIncrementSpeed: this.incrementSpeed,
            autoIncrementMaxSpeed: this.incrementMaxSpeed,
            autoIncrementAcceleration: this.incrementAcceleration,
        }
    },

    methods: {
        onSliderInput(event) {
            this.number = this.enforceLimits(this.textToNumber(event.target.value));
            this.emitChange();
            this.text = '' + this.number;
        },

        emitChange() {
            this.$emit('changed', this.number);
        },

        onLabelClicked() {
            this.$refs.textfield.focus();
        },

        textToFloat(text) {
            const value = parseFloat(text.replace(/[^\d.-]/g, ''));
            if (isFinite(value)) {
                return value;
            }
            return 0;
        },

        textToInt(text) {
            const value = parseInt(text.replace(/[^\d-]/g, ''));
            if (isFinite(value)) {
                return value;
            }
            return 0;
        },

        textToNumber(text) {
            text = '' + text;
            if (this.format === 'float') {
                return this.textToFloat(text);
            } else {
                return this.textToInt(text);
            }
        },

        delaySubmit() {
            this.updateDelayer.delay();
        },

        submitEvent() {
            this.number = this.enforceLimits(this.textToNumber(this.text));
            this.sliderValue = this.number;
            this.emitChange();
        },

        onStepClicked(direction) {
            if (this.disabled) {
                return;
            }

            let value = this.textToNumber(this.text);
            const step = Math.max(0.00001, this.step);
            value = value + step * direction;
            const preciseDigits = Math.max(0, Math.ceil(Math.log10(1/step)))
            value = parseFloat(value.toFixed(preciseDigits));

            this.number = this.enforceLimits(value);
            this.sliderValue = this.number;
            this.emitChange();
            this.text = '' + this.number;
        },

        enforceLimits(value) {
            if (this.min !== null) {
                if (value < this.min) {
                    return this.min;
                }
            }
            if (this.max !== null) {
                if (value > this.max) {
                    return this.max;
                }
            }
            return value;
        },

        onMouseDownIncrement(event) {
            this.onMouseDown(event, 1);
        },

        onMouseDownDecrement(event) {
            this.onMouseDown(event, -1);
        },

        onMouseDown(event, direction) {
            this.autoIncrementDirection = direction;

            if (this.autoIncrementDelayTimeoutId) {
                clearTimeout(this.autoIncrementDelayTimeoutId);
            }

            this.autoIncrementDelayTimeoutId = setTimeout(() => {
                this.initAutoIncrement();
            }, this.autoIncrementInitDelay);

            document.body.addEventListener('mouseup', this.onMouseUp);
        },

        onMouseUp() {
            document.body.removeEventListener('mouseup', this.onMouseUp);

            if (this.autoIncrementIntervalId) {
                clearInterval(this.autoIncrementIntervalId);
                this.autoIncrementIntervalId = -1;
            }

            if (this.autoIncrementDelayTimeoutId) {
                clearTimeout(this.autoIncrementDelayTimeoutId);
                this.autoIncrementDelayTimeoutId = -1;
            }
        },

        initAutoIncrement() {
            this.autoIncrementSpeed = this.incrementSpeed;
            this.number = this.textToNumber(this.text);

            const step = Math.max(0.00001, this.step);

            this.autoIncrementIntervalId = setInterval(() => {
                let value = this.enforceLimits(this.number + step * this.autoIncrementDirection * Math.floor(this.autoIncrementSpeed));
                const preciseDigits = Math.max(0, Math.ceil(Math.log10(1/step)))
                value = parseFloat(value.toFixed(preciseDigits));
                this.number = value;

                this.text = '' + this.number;
                this.sliderValue = this.number;
                this.emitChange();

                if (this.autoIncrementSpeed < this.autoIncrementMaxSpeed) {
                    this.autoIncrementSpeed += this.autoIncrementAcceleration;
                }
            }, this.autoIncrementDelay);
        }
    },

    computed: {
        isSlider() {
            return this.slider&& this.min !== null && (this.max !== null || this.softMax !== null);
        },

        sliderMax() {
            if (this.max !== null) {
                return this.max;
            } else {
                return this.softMax;
            }
        }
    },

    watch: {
        value(newValue) {
            this.text = numberToText(newValue);
            this.sliderValue = newValue;
        },
    }
}
</script>