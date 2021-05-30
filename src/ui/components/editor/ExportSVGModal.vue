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
                </tr>
                <tr>
                    <td colspan="2">
                        Placement
                        <select v-model="placement">
                            <option value="top-left">Top Left</option>
                            <option value="centered">Centered</option>
                            <option value="stretched">Stretched</option>
                        </select>
                    </td>
                    <td colspan="2">
                        <input type="checkbox" v-model="shouldExportBackground" id="chk-export-svg-background"/><label for="chk-export-svg-background"> Export SVG Background</label>
                    </td>
                </tr>
            </tbody>
        </table>

        <svg ref="svgContainer" class="export-svg-preview"
            width="100%" height="300px"
            :viewBox="`${-paddingLeft - previewPadding} ${-paddingTop - previewPadding} ${viewBoxWidth + 2*previewPadding} ${viewBoxHeight + 2*previewPadding}`"
            :preserveAspectRatio="preserveAspectRatio"
            :style="svgStyle"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xhtml="http://www.w3.org/1999/xhtml"
            xmlns:xlink="http://www.w3.org/1999/xlink" >
            <g data-preview-ignore="true">
                <rect :x="-paddingLeft" :y="-paddingTop" :width="viewBoxWidth+paddingLeft" :height="viewBoxHeight+paddingTop"
                    style="fill:none; stroke-width:1; stroke:rgba(100,100,255, 0.2)"
                    :style="{'stroke-width': previewStrokeSize}"/>
            </g>
            <g v-html="svgHtml"></g>
        </svg>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import NumberTextfield from '../NumberTextfield.vue';
import map from 'lodash/map';
import forEach from 'lodash/forEach';

export default {
    props: {
        // array of {item, html} elements
        exportedItems  : { value: [], type: Array },
        width          : { value: 300, type: Number },
        height         : { value: 300, type: Number },
        backgroundColor: { value: 'rgba(255,255,255,1.0)', type: String}
    },

    components: {Modal, NumberTextfield},

    data() {
        const svgHtml = map(this.exportedItems, e => e.html).join('\n');
        let paddingTop = 0;
        let paddingLeft = 0;
        let viewBoxWidth = this.width;
        let viewBoxHeight = this.height;

        if (this.exportedItems.length === 1) {
            const strokeSize = this.exportedItems[0].item.shapeProps.strokeSize;
            if (!isNaN(strokeSize)) {
                paddingTop = strokeSize;
                paddingLeft = strokeSize;
                viewBoxWidth += 2*strokeSize;
                viewBoxHeight += 2*strokeSize;
            }
        }
        return {
            shouldExportBackground: false,
            paddingTop,
            paddingLeft,
            viewBoxWidth,
            viewBoxHeight,
            placement: 'centered', // can be top-left, centered, stretched
            svgHtml: svgHtml,
            previewPadding: 20
        };
    },

    methods: {
        saveIt() {
            const svgDom = this.$refs.svgContainer.cloneNode(true);
            forEach(svgDom.childNodes, child => {
                if (child && child.nodeType === Node.ELEMENT_NODE) {
                    if (child.getAttribute('data-preview-ignore') === 'true') {
                        svgDom.removeChild(child);
                    }
                }
            });

            svgDom.setAttribute('viewBox', `${-this.paddingLeft} ${-this.paddingTop} ${this.viewBoxWidth} ${this.viewBoxHeight}`);

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
                this.$emit('close');
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
        },

        svgStyle() {
            if (this.shouldExportBackground) {
                return {
                    background: this.backgroundColor
                };
            }
            return {};
        },

        previewStrokeSize() {
            const vw = this.viewBoxWidth + 2 * this.previewPadding + this.paddingLeft;
            const vh = this.viewBoxHeight + 2 * this.previewPadding + this.paddingTop;

            if (Math.abs(vw) < 0.001 || Math.abs(vh) < 0.001) {
                return 1;
            }

            return 2 * Math.max(Math.abs(vw/600), Math.abs(vh/380));
        }
    }
}
</script>