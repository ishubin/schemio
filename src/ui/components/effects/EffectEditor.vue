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
                        <PropertyInput
                            :descriptor="arg"
                            :value="effectArgs[argName]"
                            :schemeContainer="schemeContainer"
                            @input="onPropChange(argName, arguments[0])"
                            />
                    </td>
                </tr>
            </tbody>
        </table>

    </div>
</template>

<script>
import utils from '../../utils';

import PropertyInput from '../editor/properties/PropertyInput.vue';
import Tooltip from '../Tooltip.vue';
import {getEffectById} from './Effects';

export default {
    props: ['effectId', 'effectArgs', 'schemeContainer'],

    components: {PropertyInput, Tooltip},

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
