<template>
    <div class="label">
        <span ref="input" class="guide-input" v-if="guide.number" contenteditable="true" @keydown="onValueKeyPress" @keyup="onValueKeyUp">{{ guide.value }}</span>
        <Dropdown
            :inline="true"
            :borderless="true"
            :hoverEffect="false"
            :searchEnabled="false"
            :options="filteredOptions"
            @selected="onGuideTypeSelected"
            >
            <i :class="guide.icon"></i>
        </Dropdown>
        <slot></slot>
    </div>
</template>

<script>

import Dropdown from '../../Dropdown.vue';

export default {
    props: {
        guide: { type: Object, required: true},
        guideOptions: { type: Array, required: true},
    },

    components: {Dropdown},

    data() {
        return {
            filteredOptions: this.guideOptions.filter(option => option.type !== this.guide.type)
        };
    },

    methods: {
        onGuideTypeSelected(option) {
            this.$emit('type-selected', option);
        },
        onValueKeyPress(event) {
            const code = event.charCode || event.keyCode;
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === '.' || event.key === 'Backspace' || event.key === 'Delete') {
                return;
            }
            if (event.code === 'KeyV' && (event.metaKey || event.ctrlKey)) {
                return;
            }
            if (event.code === 'KeyC' && (event.metaKey || event.ctrlKey)) {
                return;
            }
            if (code < 45 || code > 57 || code === 47) {
                event.preventDefault();
            }
        },

        onValueKeyUp(event) {
            const value = parseInt(this.$refs.input.innerText);
            if (!isNaN(value)) {
                this.$emit('value-changed', value);
            }
        }
    }
}
</script>