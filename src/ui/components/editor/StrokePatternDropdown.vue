<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <dropdown :options="patternOptions"
        @selected="$emit('selected', arguments[0].name)">
        <div v-html="selectedPatternHtml"></div>
    </dropdown>
</template>

<script>
import StrokePattern from './items/StrokePattern';
import Dropdown from '../Dropdown.vue';
import forEach from 'lodash/forEach';
import utils from '../../utils';

const patternOptions = [];

forEach(StrokePattern.patterns, pattern => {
    patternOptions.push({
        name: pattern,
        html: StrokePattern.generateStrokeHtml(pattern, 2, 15, 150, 30)
    });
});

export default {
    props: {
        value: { type: String },
        width : {type: Number, default: 140},
    },
    components: {Dropdown},

    data() {
        return {
            patternOptions: utils.clone(patternOptions)
        }
    },

    computed: {
        selectedPatternHtml() {
            return StrokePattern.generateStrokeHtml(this.value, 2, 6, this.width, 15);
        }
    }
}
</script>