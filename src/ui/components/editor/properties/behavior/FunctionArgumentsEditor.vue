<template>
    <modal @close="$emit('close')" :width="400">
        <div style="max-height: 400px; overflow: auto;">
            <table class="properties-table">
                <tr v-for="(arg, argName) in functionDescription.args">
                    <td class="label" width="50%">{{arg.name}}</td>
                    <td class="value" width="50%">
                        <input v-if="arg.type === 'string' || arg.type === 'number' || arg.type === 'image'"
                            class="textfield"
                            :value="argumentValues[argName]"
                            @input="argumentValues[argName] = arguments[0].target.value; emitArgumentChange(argName)"/>

                        <color-picker v-if="arg.type === 'color'" :color="argumentValues[argName]"
                            @input="argumentValues[argName] = arguments[0]; emitArgumentChange(argName)"/>

                        <input v-if="arg.type === 'boolean'" type="checkbox" :value="argumentValues[argName]"
                            @input="argumentValues[argName] = arguments[0].target.checked; emitArgumentChange(argName)"/>

                        <select v-if="arg.type === 'choice'" :value="argumentValues[argName]"
                            @input="argumentValues[argName]=arguments[0].target.value; emitArgumentChange(argName);">
                            <option v-for="option in arg.options">{{option}}</option>
                        </select>
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

export default {
    props: ['functionDescription', 'args'],
    components: {Modal, ColorPicker},

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
            argumentValues
        };
    },

    methods: {
        emitArgumentChange(argIndex) {
            this.$emit('argument-changed', argIndex, this.argumentValues[argIndex]);
        }
    }
}
</script>