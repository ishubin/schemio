<template>
    <div>
        <div class="hint hint-small">
            Uses <a href="https://katex.org/">KaTeX</a> library (TeX math syntax) for generating beautyful mathematical expressions.
            To see all supported functions visit <a class="link" target="_blank" href="https://katex.org/docs/supported.html">this documentation page</a>
        </div>

        <div class="ctrl-label">Expression</div>

        <textarea style="width: 100%;" cols="12" v-model="expression"></textarea>


        <table class="properties-table">
            <tbody>
                <tr>
                    <td class="label" width="50%">
                        Font size
                    </td>
                    <td class="value" width="50%">
                        <ColorPicker :editorId="editorId" :color="item.shapeProps.color" @input="onColorUpdate"/>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">
                        Font size
                    </td>
                    <td class="value" width="50%">
                        <NumberTextfield :value="fontSize" @changed="onFontSizeUpdate($event)" :min="1"/>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Horizontal Align</td>
                    <td class="value" width="50%">
                        <ul class="button-group">
                            <li v-for="opt in halignOptions">
                                <span class="toggle-button" :class="{toggled: halign === opt.value}"
                                    :title="opt.name"
                                    @click="updateHAlign(opt.value)">
                                    <i :class="opt.iconCss"></i>
                                </span>
                            </li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Vertical Align</td>
                    <td class="value" width="50%">
                        <ul class="button-group">
                            <li v-for="opt in valignOptions">
                                <span class="toggle-button" :class="{toggled: valign === opt.value}"
                                    :title="opt.name"
                                    @click="updateVAlign(opt.value)">
                                    <i :class="opt.iconCss"></i>
                                </span>
                            </li>
                        </ul>
                    </td>
                </tr>
            </tbody>
        </table>


    </div>
</template>

<script>
import EditorEventBus from '../../EditorEventBus';
import NumberTextfield from '../../../NumberTextfield.vue';
import ColorPicker from '../../ColorPicker.vue';

export default {
    props: {
        editorId: {type: String, required: true},
        item: {type: Object},
        refreshKey: {type: String}
    },

    components: {NumberTextfield, ColorPicker},

    data() {
        return {
            expression: this.item.shapeProps.expression,
            fontSize: this.item.shapeProps.fontSize,
            halign: this.item.shapeProps.halign,
            valign: this.item.shapeProps.valign,

            halignOptions: [{
                name: 'Left', value: 'left', iconCss: 'fas fa-align-left'
            }, {
                name: 'Center', value: 'center', iconCss: 'fas fa-align-center'
            }, {
                name: 'Right', value: 'right', iconCss: 'fas fa-align-right'
            }],

            valignOptions: [{
                name: 'Top', value: 'top', iconCss: 'schemio-icon schemio-icon-valign-top'
            }, {
                name: 'Middle', value: 'middle', iconCss: 'schemio-icon schemio-icon-valign-middle'
            }, {
                name: 'Bottom', value: 'bottom', iconCss: 'schemio-icon schemio-icon-valign-bottom'
            }],
        }
    },

    methods: {
        emitChange(field) {
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, field);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.shapeProps.${field}`);
        },

        onColorUpdate(color) {
            this.item.shapeProps.color = color;
            this.emitChange('color');
        },

        updateHAlign(halign) {
            this.halign = halign;
            this.item.shapeProps.halign = halign;
            this.emitChange('halign');
        },

        updateVAlign(valign) {
            this.valign = valign;
            this.item.shapeProps.valign = valign;
            this.emitChange('valign');
        },

        onFontSizeUpdate(fontSize) {
            this.fontSize = fontSize;
            this.item.shapeProps.fontSize = fontSize;
            this.emitChange('fontSize');
        }
    },

    watch: {
        expression(value) {
            this.item.shapeProps.expression = value;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'expression');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.shapeProps.expression`);
        }
    }
}
</script>