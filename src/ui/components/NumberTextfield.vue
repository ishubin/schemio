<template>
    <div class="number-textfield-container" :class="{disabled: disabled}">
        <input type="text" :style="{'padding-left': paddingLeft+'px'}" v-model="text" @input="onUserInput" :disabled="disabled"/>
        <div v-if="name" class="label" ref="label">{{name}}</div>
        <div v-if="!name && icon" class="label" ref="icon"><i :class="icon"></i></div>

        <ul class="step-controls">
            <li>
                <span class="step step-up" @click="onStepClicked(1)" @mousedown="onMouseDownIncrement"><i class="fas fa-caret-up"></i></span>
            </li>
            <li>
                <span class="step step-down" @click="onStepClicked(-1)" @mousedown="onMouseDownDecrement"><i class="fas fa-caret-down"></i></span>
            </li>
        </ul>
    </div>
</template>
<script>
export default {
    props: {
        value   : [Number, String, Object],
        format  : {type: String, default: 'float'},
        name    : {type: String, default: null},
        icon    : {type: String, default: null},
        min     : {type: Number, default: null},
        max     : {type: Number, default: null},
        disabled: {type: Boolean, default: false},
    },

    mounted() {
        if (this.$refs.label) {
            this.paddingLeft = this.$refs.label.getBoundingClientRect().width;
        }
        if (this.$refs.icon) {
            this.paddingLeft = this.$refs.icon.getBoundingClientRect().width;
        }
    },

    beforeDestroy() {
        document.body.removeEventListener('mouseup', this.onMouseUp);
    },

    data() {
        return {
            text: this.value,
            number: this.value,

            paddingLeft: 4,

            autoIncrementDelayTimeoutId: -1,
            autoIncrementDirection: 1,
            autoIncrementInitDelay: 300,
            autoIncrementDelay: 50,
            autoIncrementIntervalId: -1,
            autoIncrementSpeed: 1,
            autoIncrementMaxSpeed: 50,
            autoIncrementAcceleration: 0.15,
        }
    },

    methods: {
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

        onUserInput(event) {
            const text = event.target.value;
            this.number = this.enforceLimits(this.textToNumber(text));
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
            this.autoIncrementSpeed = 1;
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
            this.text = newValue;
        }
    }
}
</script>