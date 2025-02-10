<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="number-textfield-container" :class="{disabled: disabled}">
        <div v-if="name" class="label" ref="label" @click="onLabelClicked">{{name}}</div>
        <div v-if="!name && icon" class="label" ref="icon"><i :class="icon"></i></div>
        <div class="wrapper">
            <input ref="textfield" type="text" v-model="text" @keydown="delaySubmit" @keydown.enter="submitEvent" :disabled="disabled"/>

            <div class="step-controls">
                <span class="step step-up" @click="onStepClicked(1)" @mousedown="onMouseDownIncrement"><i class="fas fa-caret-up"></i></span>
                <span class="step step-down" @click="onStepClicked(-1)" @mousedown="onMouseDownDecrement"><i class="fas fa-caret-down"></i></span>
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
        min                  : {type: Number, default: null},
        max                  : {type: Number, default: null},
        disabled             : {type: Boolean, default: false},
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
            number: this.value,
            updateDelayer: createDelayer(100, () => {
                this.submitEvent();
            }),

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
            this.$emit('changed', this.number);
        },

        onStepClicked(factor) {
            if (this.disabled) {
                return;
            }

            let value = this.textToNumber(this.text);
            value = value + factor;

            this.number = this.enforceLimits(value);

            this.$emit('changed', this.number);
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

            this.autoIncrementIntervalId = setInterval(() => {
                this.number = this.enforceLimits(this.number + this.autoIncrementDirection * Math.floor(this.autoIncrementSpeed));
                this.text = '' + this.number;
                this.$emit('changed', this.number);

                if (this.autoIncrementSpeed < this.autoIncrementMaxSpeed) {
                    this.autoIncrementSpeed += this.autoIncrementAcceleration;
                }
            }, this.autoIncrementDelay);
        }
    },

    watch: {
        value(newValue) {
            this.text = numberToText(newValue);
        }
    }
}
</script>