<template>
    <div>
        <table class="properties-table">
            <tbody>
                <tr v-for="(arg, argName) in effectArgDefinitions">
                    <td class="label" width="50%">
                        {{arg.name}}
                        <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                    </td>
                    <td class="value" width="50%">
                        <number-textfield v-if="arg.type === 'number'" :value="effectArgs[argName]" @changed="onPropChange(argName, arg.type, arguments[0])" :min="arg.min" :max="arg.max"/>

                        <color-picker v-if="arg.type === 'color'" :color="effectArgs[argName]"  @input="onPropChange(argName, arg.type, arguments[0])"></color-picker>
                    </td>
                </tr>
            </tbody>
        </table>

    </div>
</template>

<script>
import utils from '../../utils';

import NumberTextfield from '../NumberTextfield.vue';
import ColorPicker from '../editor/ColorPicker.vue';
import Tooltip from '../Tooltip.vue';
import {getEffectById} from './Effects';

export default {
    props: ['effectId', 'effectArgs'],

    components: {NumberTextfield, ColorPicker, Tooltip},

    data() {
        const effect = getEffectById(this.effectId);

        return {
            effectArgDefinitions: utils.clone(effect.args)
        };
    },

    methods: {
        onPropChange(argName, argType, value) {
            this.$emit('effect-prop-changed', argName, argType, value);
        }
    }
}
</script>
