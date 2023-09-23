<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <table class="properties-table">
            <tr v-for="(arg, argName) in argsDefinition" v-if="argumentControlStates[argName]">
                <td v-if="arg.type !== 'script'" class="label" :class="{disabled: !argumentControlStates[argName].shown}" width="50%">
                    {{arg.name}}
                    <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                </td>
                <td v-if="arg.type !== 'script'" class="value" :class="{disabled: !argumentControlStates[argName].shown}" width="50%">
                    <input v-if="arg.type === 'string' || arg.type === 'image'"
                        class="textfield"
                        :value="argumentValues[argName]"
                        :disabled="!argumentControlStates[argName].shown"
                        @input="onValueChange(argName, arguments[0].target.value)"/>

                    <number-textfield v-if="arg.type === 'number'" :value="argumentValues[argName]" :disabled="!argumentControlStates[argName].shown" @changed="onValueChange(argName, arguments[0])"/>

                    <color-picker v-if="arg.type === 'color'" :color="argumentValues[argName]"
                        :disabled="!argumentControlStates[argName].shown"
                        @input="onValueChange(argName, arguments[0])"/>

                    <advanced-color-editor v-if="arg.type === 'advanced-color'" :value="argumentValues[argName]"
                        :apiClient="apiClient"
                        @changed="onValueChange(argName, arguments[0])"
                        :disabled="!argumentControlStates[argName].shown" />

                    <input v-if="arg.type === 'boolean'" type="checkbox" :checked="argumentValues[argName]"
                        :disabled="!argumentControlStates[argName].shown"
                        @input="onValueChange(argName, arguments[0].target.checked)"/>

                    <select v-if="arg.type === 'choice'" :value="argumentValues[argName]"
                        :disabled="!argumentControlStates[argName].shown"
                        @input="onValueChange(argName, arguments[0].target.value)">
                        <option v-for="option in arg.options">{{option}}</option>
                    </select>

                    <ElementPicker v-if="arg.type === 'element'"
                        :editorId="editorId"
                        :scheme-container="schemeContainer"
                        :element="argumentValues[argName]"
                        :disabled="!argumentControlStates[argName].shown"
                        :use-self="false"
                        @selected="onValueChange(argName, arguments[0])"
                    />
                </td>
                <td v-else colspan="2">
                    <div class="label">
                        {{arg.name}}
                        <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                    </div>

                    <div v-if="arg.type === 'script'" class="script-property-container">
                        <textarea :value="argumentValues[argName]"
                            :disabled="!argumentControlStates[argName].shown"
                            @input="onValueChange(argName, arguments[0].target.value)"></textarea>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</template>
<script>
import forEach from 'lodash/forEach';
import mapValues from 'lodash/mapValues';
import ColorPicker from './ColorPicker.vue';
import AdvancedColorEditor from './AdvancedColorEditor.vue';
import Modal from '../Modal.vue';
import ElementPicker from './ElementPicker.vue';
import Tooltip from '../Tooltip.vue';
import NumberTextfield from '../NumberTextfield.vue';

export default {
    props: {
        editorId           : {type: String, required: true},
        argsDefinition     : {type: Object, required: true},
        args               : {type: Object, required: true},
        schemeContainer    : {type: Object, required: true},
        apiClient          : {type: Object, default: null}
    },

    components: {Modal, ColorPicker, ElementPicker, Tooltip, NumberTextfield, AdvancedColorEditor},

    beforeMount() {
        this.updateArgumentControlDependencies();
    },

    data() {
        const argumentValues = {};
        forEach(this.argsDefinition, (arg, argName) => {
            if (this.args.hasOwnProperty(argName)) {
                argumentValues[argName] = this.args[argName];
            } else {
                argumentValues[argName] =  arg.value;
            }
        });
        return {
            argumentValues,
            argumentControlStates: mapValues(this.argsDefinition, () => {return {shown: true};}),
        };
    },

    methods: {
        updateArgumentControlDependencies() {
            forEach(this.argsDefinition, (argConfig, argName) => {
                if (argConfig.depends) {
                    if (!this.argumentControlStates[argName]) {
                        this.argumentControlStates[argName] = {shown: shown};
                    }
                    let shown = true;
                    forEach(argConfig.depends, (depArgValue, depArgName) => {
                        shown = shown && this.argumentValues[depArgName] === depArgValue;
                    });
                    this.argumentControlStates[argName].shown = shown;
                }
            });
        },

        onValueChange(argName, value) {
            this.argumentValues[argName] = value;
            this.emitArgumentChange(argName);
            this.updateArgumentControlDependencies();
        },

        emitArgumentChange(argName) {
            this.$emit('argument-changed', argName, this.argumentValues[argName]);
        },
    }
}
</script>