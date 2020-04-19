<template>
    <dropdown :value="selectedPattern" :options="patternOptions"
        @selected="$emit('selected', arguments[0].name)">
        <span :style="{'background-image': `url(/images/line-patterns/${selectedPattern}.svg)`, 'display': 'block', 'height': '20px', 'width': '140px', 'background-repeat': 'no-repeat'}"></span>
    </dropdown>
</template>
<script>
import Connector from './../../scheme/Connector';
import Dropdown from '../Dropdown.vue';

export default {
    props: ['value'],
    components: {Dropdown},

    computed: {
        patternOptions() {
            return _.map(Connector.Pattern.values(), pattern => {
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
            return this.value || Connector.Pattern.SOLID;
        }
    }
}
</script>