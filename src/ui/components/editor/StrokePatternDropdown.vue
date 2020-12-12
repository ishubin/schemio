<template>
    <dropdown :options="patternOptions"
        @selected="$emit('selected', arguments[0].name)">
        <span :style="{'background-image': `url(/images/line-patterns/${selectedPattern}.svg)`, 'display': 'block', 'height': height, 'width': width, 'background-size': 'auto 100%', 'background-repeat': 'no-repeat'}"></span>
    </dropdown>
</template>
<script>
import StrokePattern from './items/StrokePattern';
import Dropdown from '../Dropdown.vue';
import map from 'lodash/map';

export default {
    props: {
        value: { type: String },
        width : {type: String, default: '140px'},
        height: {type: String, default: '20px'},
    },
    components: {Dropdown},

    computed: {
        patternOptions() {
            return map(StrokePattern.patterns, pattern => {
                return {
                    name: pattern,
                    style: {
                        'background-image': `url(/images/line-patterns/${pattern}.svg)`,
                        'background-repeat': 'no-repeat',
                        'height': '20px',
                        'font-size': '0',
                        'display': 'block'
                    }
                }
            });
        },

        selectedPattern() {
            return this.value || StrokePattern.patterns[0];
        }
    }
}
</script>