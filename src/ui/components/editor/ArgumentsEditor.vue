<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <table class="properties-table">
            <tr v-for="(arg, argName) in argsDefinition" v-if="argumentControlStates[argName] && !isDisabledScript(arg, argName)">
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
                        <a class="link" target="_blank" href="https://github.com/ishubin/schemio/blob/master/docs/Scripting.md">(documentation)</a>
                    </div>

                    <ScriptEditor v-if="arg.type === 'script'"
                        :key="`script-editor-${argName}-${editorId}`"
                        :value="argumentValues[argName]"
                        @changed="onValueChange(argName, arguments[0])"
                    />
                </td>
            </tr>
        </table>
    </div>
</template>
<script>
import {forEach, mapObjectValues} from '../../collections';
import ColorPicker from './ColorPicker.vue';
import AdvancedColorEditor from './AdvancedColorEditor.vue';
import Modal from '../Modal.vue';
import ElementPicker from './ElementPicker.vue';
import Tooltip from '../Tooltip.vue';
import NumberTextfield from '../NumberTextfield.vue';
import ScriptEditor from './ScriptEditor.vue';

export default {
    props: {
        editorId           : {type: String, required: true},
        argsDefinition     : {type: Object, required: true},
        args               : {type: Object, required: true},
        schemeContainer    : {type: Object, required: true},
        apiClient          : {type: Object, default: null}
    },

    components: {Modal, ColorPicker, ElementPicker, Tooltip, NumberTextfield, AdvancedColorEditor, ScriptEditor},

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
            argumentControlStates: mapObjectValues(this.argsDefinition, () => {return {shown: true};}),
            scriptEnlarged: false,
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

        /**
         * determines whether the argument is of script type and it is disabled
         * In this case we don't want to render it at all as it is taking too much space
         */
        isDisabledScript(arg, argName) {
            return arg.type === 'script' && !this.argumentControlStates[argName].shown;
        }
    }
}
</script>