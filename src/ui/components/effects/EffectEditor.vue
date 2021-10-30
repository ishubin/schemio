<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
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
                        <number-textfield v-if="arg.type === 'number'" :value="effectArgs[argName]" @changed="onPropChange(argName, arguments[0])" :min="arg.min" :max="arg.max"/>

                        <color-picker v-if="arg.type === 'color'" :color="effectArgs[argName]"  @input="onPropChange(argName, arguments[0])"></color-picker>
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
        onPropChange(argName, value) {
            this.$emit('effect-arg-changed', argName, value);
        }
    }
}
</script>
