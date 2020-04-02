<template>
    <div class="number-textfield-container">
        <input type="text" :style="{'padding-left': paddingLeft+'px'}" v-model="text" @input="onUserInput"/>
        <div v-if="name" class="label" ref="label">{{name}}</div>
        <div v-if="!name && icon" class="label" ref="icon"><i :class="icon"></i></div>

        <ul class="step-controls">
            <li>
                <span class="step" @click="onStepClicked(1)"><i class="fas fa-caret-up"></i></span>
            </li>
            <li>
                <span class="step" @click="onStepClicked(-1)"><i class="fas fa-caret-down"></i></span>
            </li>
        </ul>
        </div>
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
        max     : {type: Number, default: null}
    },

    mounted() {
        if (this.$refs.label) {
            this.paddingLeft = this.$refs.label.getBoundingClientRect().width;
        }
        if (this.$refs.icon) {
            this.paddingLeft = this.$refs.icon.getBoundingClientRect().width;
        }
    },

    data() {
        return {
            text: this.value,
            paddingLeft: 4
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
            this.$emit('changed', this.enforceLimits(this.textToNumber(text)));
        },

        onStepClicked(factor) {
            let value = this.textToNumber(this.text);
            value = value + factor;
            
            value = this.enforceLimits(value);

            this.$emit('changed', value);
            this.text = '' + value;
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
        }
    },

    watch: {
        value(newValue) {
            this.text = newValue;
        }
    }
}
</script>