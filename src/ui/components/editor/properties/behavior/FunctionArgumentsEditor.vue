<template>
    <modal @close="$emit('close')">
        <table>
            <tr v-for="(arg, argIndex) in functionDescription.args">
                <td>{{arg.name}}</td>
                <td>
                    <input v-if="arg.type === 'string' || arg.type === 'number' || arg.type === 'image'"
                        :value="argumentValues[argIndex]"
                        @input="argumentValues[argIndex] = arguments[0].target.value; emitArgumentChange(argIndex)"/>

                    <color-picker v-if="arg.type === 'color'" :color="argumentValues[argIndex]"
                        @input="argumentValues[argIndex] = arguments[0]; emitArgumentChange(argIndex)"/>

                    <input v-if="arg.type === 'boolean'" type="checkbox" :value="argumentValues[argIndex]"
                        @input="argumentValues[argIndex] = arguments[0].target.checked; emitArgumentChange(argIndex)"/>

                    <select v-if="arg.type === 'choice'" :value="argumentValues[argIndex]"
                        @input="argumentValues[argIndex]=arguments[0].target.value; emitArgumentChange(argIndex);"/>
                        <option v-for="option in arg.options">{{option}}</option>
                    </select>
                </td>
            </tr>
        </table>
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
        return {
            argumentValues: _.map(this.functionDescription.args, (arg, argIndex) => {
                if (argIndex < this.args.length) {
                    return this.args[argIndex];
                } else {
                    return arg.value;
                }
            })
        };
    },

    methods: {
        emitArgumentChange(argIndex) {
            this.$emit('argument-changed', argIndex, this.argumentValues[argIndex]);
        }
    }
}
</script>