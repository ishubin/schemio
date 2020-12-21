<template>
    <dropdown :options="capOptions"
        @selected="$emit('selected', arguments[0].name)">
        <span :style="{'background-image': `url(/assets/images/curves/curve-cap-${selectedOption}.svg)`, 'display': 'block', 'height': height, 'width': width, 'background-size': 'auto 100%', 'background-repeat': 'no-repeat', transform: cssTransform}"></span>
    </dropdown>
</template>
<script>
import Dropdown from '../Dropdown.vue';
import map from 'lodash/map';
import Path from '../../scheme/Path';


export default {
    props: {
        value: { type: String },
        isSource: { type: Boolean, default: false },
        width : {type: String, default: '30px'},
        height: {type: String, default: '20px'},
    },
    components: {Dropdown},

    computed: {
        capOptions() {
            let transform = null;
            if (this.isSource) {
                transform = 'rotate(180deg)'
            }
            return map(Path.CapType.values(), capType => {
                return {
                    name: capType,
                    style: {
                        'background-image' : `url(/assets/images/curves/curve-cap-${capType}.svg)`,
                        'background-repeat': 'no-repeat',
                        'width'            : '20px',
                        'height'           : '20px',
                        'font-size'        : '0',
                        'display'          : 'block',
                        'transform'        : transform
                    }
                }
            });
        },

        selectedOption() {
            return this.value || Path.CapType.EMPTY;
        },

        cssTransform() {
            if (this.isSource) {
                return 'rotate(180deg)';
            }
            return null;
        }
    }
}
</script>