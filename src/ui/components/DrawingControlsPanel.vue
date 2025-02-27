<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <div class="section">
            <span class="btn btn-secondary" @click="$emit('stop-drawing-requested')">Stop drawing</span>
        </div>

        <div class="section">
            <div v-for="color in drawColorPallete" class="draw-color-pallete-option" :style="{background: color}" @click="$emit('color-picked', color)"></div>
        </div>
        <table class="properties-table">
            <tbody>
                <tr v-if="isBrush">
                    <td class="label" width="50%">Size</td>
                    <td class="value" width="50%">
                        <NumberTextfield :value="brushSize" @changed="onBrushSizeChanged" :min="1" :softMax="100" :slider="true"/>
                    </td>
                </tr>
                <tr v-else>
                    <td class="label" width="50%">Size</td>
                    <td class="value" width="50%">
                        <NumberTextfield :value="pencilSize" @changed="onPencilSizeChanged" :min="1" :softMax="100" :slider="true"/>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Smoothing</td>
                    <td class="value" width="50%">
                        <NumberTextfield :value="drawEpsilon" @changed="onDrawEpsilonChanged" :min="0" :softMax="20" :slider="true"/>
                    </td>
                </tr>
            </tbody>
        </table>

    </div>
</template>

<script>
import NumberTextfield from './NumberTextfield.vue';


function generateColorPallete() {
    const slCombos = [[90, 79], [72, 63], [61, 40], [94, 34]];
    const step = 60;

    const n = 6;

    const colors = [];
    for (let i = 0; i < n; i++) {
        const h = step * i;
        slCombos.forEach(([s, l]) => {
            colors.push(`hsl(${h},${s}%,${l}%)`);
        });
    }
    return colors
}


export default {
    props: {
        isBrush: {type: Boolean, default: false}
    },

    components: {NumberTextfield},

    data() {
        return {
            drawColorPallete: ['rgba(0,0,0,1)', 'rgba(76,76,76,1)', 'rgba(128,128,128,1)',
                'rgba(170,170,170,1)', 'rgba(255,255,255,1)']
                .concat(generateColorPallete()),
            brushSize: 10,
        }
    },


    methods: {
        onDrawEpsilonChanged(value) {
            this.$store.dispatch('updateDrawEpsilon', value);
        },
        onBrushSizeChanged(value) {
            this.$store.dispatch('updateDrawBrushSize', value);
        },
        onPencilSizeChanged(value) {
            this.$store.dispatch('updateDrawPencilSize', value);
        },
    },

    computed: {
        drawEpsilon() {
            return this.$store.getters.drawEpsilon;
        },
        pencilSize() {
            return this.$store.getters.drawPencilSize;
        },
        brushSize() {
            return this.$store.getters.drawBrushSize;
        }
    }
};
</script>