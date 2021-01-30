<template>
    <modal :title="`${functionDescription.name} arguments`" @close="$emit('close')" :width="400" :use-mask="false">
        <div v-if="functionDescription.description">
            <p>{{functionDescription.description}}</p>
        </div>

        <div style="max-height: 400px; overflow: auto;">
            <table class="properties-table">
                <tr v-for="(arg, argName) in functionDescription.args" v-if="argumentControlStates[argName]">
                    <td class="label" :class="{disabled: !argumentControlStates[argName].shown}" width="50%">
                        {{arg.name}}
                        <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                    </td>
                    <td class="value" :class="{disabled: !argumentControlStates[argName].shown}" width="50%">
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
                            :disabled="!argumentControlStates[argName].shown" />

                        <input v-if="arg.type === 'boolean'" type="checkbox" :checked="argumentValues[argName]"
                            :disabled="!argumentControlStates[argName].shown"
                            @input="onValueChange(argName, arguments[0].target.checked)"/>

                        <select v-if="arg.type === 'choice'" :value="argumentValues[argName]"
                            :disabled="!argumentControlStates[argName].shown"
                            @input="onValueChange(argName, arguments[0].target.value)">
                            <option v-for="option in arg.options">{{option}}</option>
                        </select>

                        <element-picker v-if="arg.type === 'element'"
                            :scheme-container="schemeContainer"
                            :element="argumentValues[argName]"
                            :disabled="!argumentControlStates[argName].shown"
                            :use-self="false"
                            @selected="onValueChange(argName, arguments[0])"
                        />
                    </td>
                </tr>
            </table>
        </div>
    </modal>
</template>
<script>
import forEach from 'lodash/forEach';
import mapValues from 'lodash/mapValues';
import Dropdown from '../../../Dropdown.vue';
import ColorPicker from '../../../editor/ColorPicker.vue';
import AdvancedColorEditor from '../../../editor/AdvancedColorEditor.vue';
import Modal from '../../../Modal.vue';
import ElementPicker from '../../ElementPicker.vue';
import Tooltip from '../../../Tooltip.vue';
import NumberTextfield from '../../../NumberTextfield.vue';

export default {
    props: ['functionDescription', 'args', 'schemeContainer', 'projectId'],
    components: {Modal, ColorPicker, ElementPicker, Tooltip, NumberTextfield, AdvancedColorEditor},

    beforeMount() {
        this.updateArgumentControlDependencies();
    },

    data() {
        const argumentValues = {};
        forEach(this.functionDescription.args, (arg, argName) => {
            if (this.args.hasOwnProperty(argName)) {
                argumentValues[argName] = this.args[argName];
            } else {
                argumentValues[argName] =  arg.value;
            }
        });
        return {
            argumentValues,
            argumentControlStates: mapValues(this.functionDescription.args, () => {return {shown: true};}),
        };
    },

    methods: {
        updateArgumentControlDependencies() {
            forEach(this.functionDescription.args, (argConfig, argName) => {
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