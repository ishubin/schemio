<template>
    <modal title="Save Style" @close="$emit('close')" primary-button="Save" @primary-submit="saveStyle()">
        <input type="text" class="textfield" v-model="styleName" placeholder="Style name..."/>
        <table class="styles-args-table">
            <tbody>
                <tr>
                    <td class="checkbox" colspan="3">
                        <input type="checkbox" @change="allCheckboxChange"/>
                    </td>
                </tr>
                <tr v-for="property in properties">
                    <td class="checkbox">
                        <input type="checkbox" :checked="property.selected"/>
                    </td>
                    <td class="property-name">{{property.title}}</td>
                    <td class="property-value">
                        <input type="text" class="style-textfield" :value="property.value" disabled/>
                    </td>
                </tr>
            </tbody>
        </table>
    </modal>
    
</template>
<script>
import Modal from '../../Modal.vue';
import Shape from '../items/shapes/Shape';
import {map, forEach} from 'lodash';
import apiClient from '../../../apiClient';

export default {
    props: ['item'],
    components: {Modal},

    data() {
        return {
            styleName: '',
            properties: []
        };
    },

    beforeMount() {
        const shape = Shape.find(this.item.shape);
        if (!shape) {
            this.$emit('close');
            return;
        }
        this.properties = map(shape.args, (arg, argName) => {
            let value = arg.value;
            if (this.item.shapeProps.hasOwnProperty(argName)) {
                value = this.item.shapeProps[argName];
            }
            return {
                name: argName,
                title: arg.name,
                type: arg.type,
                selected: value !== arg.value,
                value
            };
        });
    },

    methods: {
        saveStyle() {
            const styleProps = {};
            let hasProperties = false;
            forEach(this.properties, property => {
                if (property.selected) {
                    styleProps[property.name] = property.value;
                    hasProperties = true;
                }
            });
            if (hasProperties) {
                apiClient.styles.saveStyle(this.styleName, this.item.shape, styleProps).then(() => {
                    this.$emit('close');
                });
            }
        },

        allCheckboxChange(event) {
            forEach(this.properties, property => {
                property.selected = event.target.checked;
            });
        }
    }
}
</script>