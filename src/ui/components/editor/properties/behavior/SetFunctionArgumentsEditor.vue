<template>
    <div>
        <dropdown :options="propertyOptions" @selected="onPropertySelected(arguments[0].id)">
            <span>{{property}}</span>
        </dropdown>


        <input v-if="propertyType === 'string' || propertyType === 'number' || propertyValue === 'image'" style="width: 100px" :value="propertyValue" @input="emitValue"/>

        <color-picker v-if="propertyType === 'color'" :color="propertyValue" @input="emitValue"></color-picker>

        <input v-if="propertyType === 'boolean'" type="checkbox" v-model="propertyValue"/>

        <select v-if="propertyType === 'stroke-pattern'" v-model="propertyValue" @input="emitValue">
            <option v-for="knownPattern in knownStrokePatterns" :key="knownPattern">{{knownPattern}}</option>
        </select>
    </div>
</template>
<script>
import Dropdown from '../../../Dropdown.vue';
import Shape from '../../items/shapes/Shape.js';
import ColorPicker from '../../../editor/ColorPicker.vue';
import StrokePattern from '../../items/StrokePattern.js';

export default {
    props: ['element', 'selfItem', 'property', 'propertyValue', 'schemeContainer'],

    components: {Dropdown, ColorPicker},

    data() {
        let propertyType = 'number';
        const propertyOptions = [{
            id: 'opacity',
            name: 'Opacity'
        }];
        const shapeArgs = this.findShapeArgs();

        _.forEach(shapeArgs, (shapeArg, shapeArgName) => {
            const propertyPath = `shapeProps.${shapeArgName}`;

            if (propertyPath === this.property) {
                propertyType = shapeArg.type;
            }
            propertyOptions.push({
                id: propertyPath,
                name: shapeArg.name
            });
        });

        return {
            propertyOptions: propertyOptions,
            propertyType: propertyType,
            shapeArgs: shapeArgs,
            knownStrokePatterns: _.map(StrokePattern.getPatternsList(), pattern => {return {id: pattern, name: pattern}})
        };
    },

    methods: {
        findItem(itemId) {
            let item = this.selfItem;
            if (itemId !== 'self') {
                item = this.schemeContainer.findItemById(itemId);
            }
            return item;
        },

        findShapeArgs() {
            const item = this.findItem(this.element.item);
            if (item) {
                const shape = Shape.find(item.shape);
                if (shape) {
                    return shape.args;
                }
            }
            return {};
        },

        onPropertySelected(propertyId) {
            if (this.property !== propertyId) {
                let value = '';
                if (propertyId === 'opacity') {
                    value = 1.0;
                } else if (propertyId.indexOf('shapeProps.') === 0) {
                    const shapePropField = propertyId.substr('shapeProps.'.length);
                    const shapeArg = this.shapeArgs[shapePropField];
                    if (shapeArg) {
                        value = shapeArg.value;
                    }
                }
                this.$emit('property-changed', propertyId, value);
            }
        },

        emitValue(value) {
            this.$emit('propert-value-changed', value);
        }
    }
}
</script>