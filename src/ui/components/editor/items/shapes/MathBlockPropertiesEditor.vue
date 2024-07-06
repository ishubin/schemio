<template>
    <div>
        <div class="ctrl-label">Formula</div>

        <textarea style="width: 100%;" cols="12" v-model="formula"></textarea>


        <table class="properties-table">
            <tbody>
                <tr>
                    <td class="label" width="50%">
                        Font size
                    </td>
                    <td class="value" width="50%">
                        <NumberTextfield :value="fontSize" :disabled="disabled" @changed="onFontSizeUpdate(arguments[0])" :min="1"/>
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

export default {
    props: {
        editorId: {type: String, required: true},
        item: {type: Object},
        refreshKey: {type: String}
    },

    components: {NumberTextfield},

    data() {
        return {
            formula: this.item.shapeProps.formula,
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
        updateHAlign(halign) {
            this.halign = halign;
            this.item.shapeProps.halign = halign;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'halign');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.shapeProps.halign`);
        },

        updateVAlign(valign) {
            this.valign = valign;
            this.item.shapeProps.valign = valign;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'valign');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.shapeProps.valign`);
        },

        onFontSizeUpdate(fontSize) {
            this.fontSize = fontSize;
            this.item.shapeProps.fontSize = fontSize;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'fontSize');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.shapeProps.fontSize`);
        }
    },

    watch: {
        formula(value) {
            this.item.shapeProps.formula = value;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'formula');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.shapeProps.formula`);
        }
    }
}
</script>