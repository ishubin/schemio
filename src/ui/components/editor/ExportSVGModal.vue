<template>
    <modal title="Export as SVG" @close="$emit('close')" primary-button="Save" @primary-submit="saveIt">
        <table>
            <tbody>
                <tr>
                    <td>
                        <number-textfield :value="paddingLeft" name="Left" @changed="paddingLeft = arguments[0]"/>
                    </td>
                    <td>
                        <number-textfield :value="paddingTop" name="Top" @changed="paddingTop = arguments[0]"/>
                    </td>
                    <td>
                        <number-textfield :value="viewBoxWidth" name="Width" @changed="viewBoxWidth = arguments[0]"/>
                    </td>
                    <td>
                        <number-textfield :value="viewBoxHeight" name="Height" @changed="viewBoxHeight = arguments[0]"/>
                    </td>
                    <td>
                        <select v-model="placement">
                            <option value="top-left">Top Left</option>
                            <option value="centered">Centered</option>
                            <option value="stretched">Stretched</option>
                        </select>
                    </td>
                </tr>
            </tbody>
        </table>

        <svg ref="svgContainer" class="export-svg-preview" width="300px" height="300px"
            :viewBox="`${-paddingLeft} ${-paddingTop} ${viewBoxWidth} ${viewBoxHeight}`"
            :preserveAspectRatio="preserveAspectRatio"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xhtml="http://www.w3.org/1999/xhtml"
            xmlns:xlink="http://www.w3.org/1999/xlink" >
            <g :transform="`translate(0, 0)`" v-html="svgHtml"></g>
        </svg>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import NumberTextfield from '../NumberTextfield.vue';
import map from 'lodash/map';

export default {
    props: {
        // array of {item, html} elements
        exportedItems: { value: [], type: Array },
        width        : { value: 300, type: Number },
        height       : { value: 300, type: Number },
    },

    components: {Modal, NumberTextfield},

    data() {
        const svgHtml = map(this.exportedItems, e => e.html).join('\n');
        return {
            paddingTop: 0,
            paddingLeft: 0,
            viewBoxWidth: this.width,
            viewBoxHeight: this.height,
            placement: 'top-left', // can be top-left, centered, stretched
            svgHtml: svgHtml
        };
    },

    methods: {
        saveIt() {
            const svgDom = this.$refs.svgContainer.cloneNode(true);
            svgDom.removeAttribute('width');
            svgDom.removeAttribute('height');

            const svgCode = svgDom.outerHTML;
            const dataUrl = `data:image/svg+xml;base64,${btoa(svgCode)}`;

            const link = document.createElement('a');
            document.body.appendChild(link);

            try {
                link.href = dataUrl;
                link.download = `${this.exportedItems[0].item.name}.svg`;
                link.click();
            } catch(e) {
                console.error(e);
            }
            setTimeout(() => document.body.removeChild(link), 100);

        }
    },

    computed: {
        preserveAspectRatio() {
            if (this.placement === 'stretched') {
                return 'none';
            } else if (this.placement === 'centered') {
                return 'xMidYMid';
            }
            return 'xMinYMin';
        }
    }
}
</script>