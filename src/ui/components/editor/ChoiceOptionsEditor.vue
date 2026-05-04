<template>
    <div class="choice-options-editor">
        <div class="choice-options-preview" @click="openEditor">
            <span v-for="option in options" class="choice-option-label" :class="{selected: option === selectedDefaultValue}">{{ option }}</span>
            <span v-if="options.length === 0" class="placeholder">Click to edit</span>
            <span class="link edit-link" @click="openEditor">Edit</span>
        </div>

        <modal v-if="editorShown" title="Options" @close="editorShown = false">
            <ul class="choice-options-editor-list">
                <li v-for="(option, optionIdx) in options">
                    <span class="link icon-delete" @click="deleteOption(optionIdx)"><i class="fas fa-times"></i></span>
                    <input type="radio" v-model="selectedDefaultValue" :value="option" @input="onDefaultValueChange(option, optionIdx)" title="Default value"/>
                    <input type="text" class="textfield" :value="option" @input="onOptionValueChange(optionIdx, $event.target.value)"/>
                </li>
            </ul>
            <span class="link" @click="addOption">+ Add option</span>
        </modal>
    </div>
</template>

<script>
import Modal from '../Modal.vue';

export default {
    props: {
        options: {type: Array, required: true},
        defaultValue: {type: String},
    },

    components: {Modal},

    data() {
        let defaultIdx = 0;
        const idx = this.options.indexOf(this.defaultValue);
        if (idx >= 0) {
            defaultIdx = idx;
        }
        return {
            defaultIdx,
            editorShown: false,
            selectedDefaultValue: this.defaultValue,
            encodedValue: this.options.join(', ')
        };
    },

    methods: {
        onDefaultValueChange(value, idx) {
            this.selectedDefaultValue = value;
            this.defaultIdx = idx;
            this.emitValue();
        },
        updatedEncodedValue() {
            this.encodedValue = this.options.join(', ');
        },
        addOption() {
            this.options.push('');
            this.$forceUpdate();
            this.emitValue();
            this.updatedEncodedValue();
        },
        deleteOption(idx) {
            if (idx < 0 || idx >= this.options.length) {
                return;
            }
            this.options.splice(idx, 1);

            const defaultIdx = this.options.indexOf(this.selectedDefaultValue);
            if (defaultIdx >= 0) {
                this.defaultIdx = defaultIdx;
            } else {
                this.defaultIdx = 0;
                if (this.options.length > 0) {
                    this.selectedDefaultValue = this.options[0];
                } else {
                    this.selectedDefaultValue = '';
                }
            }
            this.$forceUpdate();
            this.emitValue();
            this.updatedEncodedValue();
        },
        onOptionValueChange(idx, value) {
            this.options[idx] = value;
            if (this.defaultIdx === idx) {
                this.selectedDefaultValue = value;
            }
            this.emitValue();
            this.updatedEncodedValue();
        },
        openEditor() {
            this.editorShown = true;
        },
        emitValue() {
            this.$emit('changed', {
                options: this.options,
                value: this.selectedDefaultValue
            });
        }
    },
}
</script>