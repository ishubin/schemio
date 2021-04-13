<template>
    <div class="element-picker" :class="{disabled: disabled}">
        <dropdown :options="allOptions" @selected="onElementSelected" :disabled="disabled">
            <div class="picked-element" :class="[`picked-element-type-${enrichedElement.type}`, disabled?'disabled': '']">
                <i :class="enrichedElement.iconClass"/>
                <span class="element-name">{{enrichedElement.name | toShortName}}</span>
            </div>
        </dropdown>
    </div>
</template>
<script>
/**
 * This component is used in order to pick any item on the scheme
 */
import Dropdown from '../Dropdown.vue';
import EventBus from './EventBus.js';
import forEach from 'lodash/forEach';
import indexOf from 'lodash/indexOf';
import shortid from 'shortid';

const maxNameSymbols = 20;

export default {
    props: {
        element:            {type: String,  default: null},
        selfItem:           {type: Object,  default: null},
        schemeContainer:    {type: Object},
        useSelf:            {type: Boolean, default: true},
        noneLabel:          {type: String,  default: 'None'},
        allowNone:          {type: Boolean, default: false},
        allowGroups:        {type: Boolean, default: true},
        excludedItemIds:    {type: Array,   default: () => []}, // array of items that should be excluded from options
        disabled:           {type: Boolean, default: false}
    },

    components: {Dropdown},

    mounted() {
        EventBus.$on(EventBus.ELEMENT_PICKED, this.onElementPickedFromState);
    },

    beforeDestroy() {
        EventBus.$off(EventBus.ELEMENT_PICKED, this.onElementPickedFromState);
    },

    data() {
        return {
            allOptions: this.collectAllOptions(),
            // used as a unique id in order to distinguish subscribed event for picking element from StatePickElement
            pickElementRequestId: null
        };
    },

    methods: {
        collectAllOptions() {
            const options = [];
            if (this.allowNone) {
                options.push({
                    iconClass: '',
                    name: 'None',
                    id: 'none',
                    type: 'none'
                });
            }
            
            options.push({
                iconClass: 'fas fa-crosshairs',
                name: 'Pick...',
                id: 'pick',
                type: 'pick'
            });


            if (this.useSelf) {
                options.push({
                    iconClass: 'fas fa-cube',
                    name: 'self',
                    id: 'self',
                    type: 'item'
                });
            }

            forEach(this.schemeContainer.getItems(), item => {
                let itemShouldBeIncluded = true;                

                if (this.excludedItemIds && this.excludedItemIds.length > 0) {
                    itemShouldBeIncluded = indexOf(this.excludedItemIds, item.id) < 0;
                }

                if (itemShouldBeIncluded) {
                    options.push({
                        iconClass: 'fas fa-cube',
                        name: item.name,
                        id: item.id,
                        type: 'item'
                    });
                }
            });

            if (this.allowGroups) {
                forEach(this.schemeContainer.itemGroups, group => {
                    options.push({
                        iconClass: 'fas fa-cubes',
                        name: group,
                        id: group,
                        type: 'item-group'
                    });
                });
            }

            return options;
        },

        onElementSelected(option) {
            if (option.id === 'self') {
                this.$emit('selected', 'self');
            } else if (option.type === 'pick') {
                this.pickElementRequestId = shortid.generate();
                EventBus.emitElementPickRequested((element) => {
                    this.$emit('selected', element);
                });
            } else {
                if (option.type === 'item') {
                    this.$emit('selected', `#${option.id}`);
                } else if (option.type === 'item-group') {
                    this.$emit('selected', `group: ${option.id}`);
                } else if (option.type === 'none') {
                    this.$emit('selected', null);
                } else {
                    console.error(option.type + ' is not supported');
                }
            }
        }
    },

    computed: {
        enrichedElement() {
            if (!this.element) {
                return {
                    name: this.noneLabel,
                    type: 'none',
                    iconClass: ''
                };
            }
            if (this.element.startsWith('group:')) {
                return {
                    name: this.element.substr(6).trim(),
                    type: 'item-group',
                    iconClass: 'fas fa-cubes'
                };
            }
            if (this.element === 'self') {
                return {
                    name: 'self',
                    iconClass: 'fas fa-cube',
                    type: 'item'
                };
            }

            const element = this.schemeContainer.findFirstElementBySelector(this.element, this.selfItem);
            if (element) {
                return {
                    name: element.name || element.id,
                    iconClass: 'fas fa-cube',
                    type: 'item'
                };
            }

            return {
                name: 'no item',
                type: 'error',
                iconClass: 'fas fa-exclamation-triangle'
            };
        }
    },

    filters: {
        toShortName(name) {
            // tried to use overflow: hidden but it din't work out
            // I hate CSS so have to use this function :( 
            if (name.length > maxNameSymbols) {
                return name.substr(0, maxNameSymbols - 1) + '…';
            }
            return name;
        }
    }
    
}
</script>