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

function generateStrokeHtml(dashArray, strokeWidth, y, w, h) {
    return `<svg width="${w}px" height="${h}px">`
        + `<path d="M0 ${y} l ${w} 0" fill="none" stroke="#111111" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}"/>`
        + '</svg>';
}

forEach(StrokePattern.patterns, pattern => {
    const dashArray = StrokePattern.createDashArray(pattern, 2);

    patternOptions.push({
        name: pattern,
        html: generateStrokeHtml(dashArray, 2, 15, 150, 30)
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
            const dashArray = StrokePattern.createDashArray(this.value, 2);
            return generateStrokeHtml(dashArray, 2, 6, this.width, 15);
        }
    }
}
</script>