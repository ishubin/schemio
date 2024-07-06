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
            fontSize: this.item.shapeProps.fontSize
        }
    },

    methods: {
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