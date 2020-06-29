<template>
    <modal :title="`${functionDescription.name} arguments`" @close="$emit('close')" :width="400" :use-mask="false">
        <div style="max-height: 400px; overflow: auto;">
            <table class="properties-table">
                <tr v-for="(arg, argName) in functionDescription.args" v-if="argumentControlStates[argName] && argumentControlStates[argName].shown">
                    <td class="label" width="50%">
                        {{arg.name}}
                        <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                    </td>
                    <td class="value" width="50%">
                        <input v-if="arg.type === 'string' || arg.type === 'image'"
                            class="textfield"
                            :value="argumentValues[argName]"
                            @input="onValueChange(argName, arguments[0].target.value)"/>

                        <number-textfield v-if="arg.type === 'number'" :value="argumentValues[argName]" @changed="onValueChange(argName, arguments[0])"/>

                        <color-picker v-if="arg.type === 'color'" :color="argumentValues[argName]"
                            @input="onValueChange(argName, arguments[0])"/>

                        <advanced-color-editor v-if="arg.type === 'advanced-color'" :value="argumentValues[argName]"/>

                        <input v-if="arg.type === 'boolean'" type="checkbox" :checked="argumentValues[argName]"
                            @input="onValueChange(argName, arguments[0].target.checked)"/>

                        <select v-if="arg.type === 'choice'" :value="argumentValues[argName]"
                            @input="onValueChange(argName, arguments[0].target.value)">
                            <option v-for="option in arg.options">{{option}}</option>
                        </select>

                        <element-picker v-if="arg.type === 'element'"
                            :scheme-container="schemeContainer"
                            :element="argumentValues[argName]"
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
import _ from 'lodash';
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
        _.forEach(this.functionDescription.args, (arg, argName) => {
            if (this.args.hasOwnProperty(argName)) {
                argumentValues[argName] = this.args[argName];
            } else {
                argumentValues[argName] =  arg.value;
            }
        });
        return {
            argumentValues,
            argumentControlStates: _.mapValues(this.functionDescription.args, () => {return {shown: true};}),
        };
    },

    methods: {
        updateArgumentControlDependencies() {
            _.forEach(this.functionDescription.args, (argConfig, argName) => {
                if (argConfig.depends) {
                    if (!this.argumentControlStates[argName]) {
                        this.argumentControlStates[argName] = {shown: shown};
                    }
                    let shown = true;
                    _.forEach(argConfig.depends, (depArgValue, depArgName) => {
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