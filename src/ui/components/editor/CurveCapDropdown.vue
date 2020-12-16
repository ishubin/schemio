<template>
    <dropdown :options="capOptions"
        @selected="$emit('selected', arguments[0].name)">
        <span :style="{'background-image': `url(/images/curves/curve-cap-${selectedOption}.svg)`, 'display': 'block', 'height': height, 'width': width, 'background-size': 'auto 100%', 'background-repeat': 'no-repeat'}"></span>
    </dropdown>
</template>
<script>
import Dropdown from '../Dropdown.vue';
import map from 'lodash/map';
import Path from '../../scheme/Path';


export default {
    props: {
        value: { type: String },
        width : {type: String, default: '30px'},
        height: {type: String, default: '20px'},
    },
    components: {Dropdown},

    computed: {
        capOptions() {
            return map(Path.CapType.values(), capType => {
                return {
                    name: capType,
                    style: {
                        'background-image': `url(/images/curves/curve-cap-${capType}.svg)`,
                        'background-repeat': 'no-repeat',
                        'height': '20px',
                        'font-size': '0',
                        'display': 'block'
                    }
                }
            });
        },

        selectedOption() {
            return this.value || Path.CapType.EMPTY;
        }
    }
}
</script>