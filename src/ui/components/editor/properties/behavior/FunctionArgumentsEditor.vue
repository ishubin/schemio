<template>
    <modal @close="$emit('close')" :width="400">
        <div style="max-height: 400px; overflow: auto;">
            <table class="properties-table">
                <tr v-for="(arg, argName) in functionDescription.args" v-if="argumentControlStates[argName] && argumentControlStates[argName].shown">
                    <td class="label" width="50%">{{arg.name}}</td>
                    <td class="value" width="50%">
                        <input v-if="arg.type === 'string' || arg.type === 'number' || arg.type === 'image'"
                            class="textfield"
                            :value="argumentValues[argName]"
                            @input="onInputChange(argName, arguments[0])"/>

                        <color-picker v-if="arg.type === 'color'" :color="argumentValues[argName]"
                            @input="onColorChange(argName, arguments[0])"/>

                        <input v-if="arg.type === 'boolean'" type="checkbox" :checked="argumentValues[argName]"
                            @input="onCheckboxChange(argName, arguments[0])"/>

                        <select v-if="arg.type === 'choice'" :value="argumentValues[argName]"
                            @input="onSelectChange(argName, arguments[0])">
                            <option v-for="option in arg.options">{{option}}</option>
                        </select>

                        <element-picker v-if="arg.type === 'element'"
                            :scheme-container="schemeContainer"
                            :element="argumentValues[argName]"
                            :use-self="false"
                            @selected="onElementSelected(argName, arguments[0])"
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
import Modal from '../../../Modal.vue';
import ElementPicker from '../../ElementPicker.vue';

export default {
    props: ['functionDescription', 'args', 'schemeContainer'],
    components: {Modal, ColorPicker, ElementPicker},

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

        onColorChange() {
            this.argumentValues[argName] = color;
            this.emitArgumentChange(argName);
            this.updateArgumentControlDependencies();
        },

        onSelectChange(argName, event) {
            this.argumentValues[argName] = event.target.value;
            this.emitArgumentChange(argName);
            this.updateArgumentControlDependencies();
        },

        onInputChange(argName, event) {
            this.argumentValues[argName] = event.target.value;
            this.emitArgumentChange(argName);
            this.updateArgumentControlDependencies();
        },

        emitArgumentChange(argName) {
            this.$emit('argument-changed', argName, this.argumentValues[argName]);
        },

        onCheckboxChange(argName, event) {
            this.argumentValues[argName] = event.target.checked;
            this.emitArgumentChange(argName);
            this.updateArgumentControlDependencies();
        },

        onElementSelected(argName, element) {
            this.argumentValues[argName] = element;
            this.emitArgumentChange(argName);
            this.updateArgumentControlDependencies();
        }
    }
}
</script>