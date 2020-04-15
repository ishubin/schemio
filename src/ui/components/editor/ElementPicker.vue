<template>
    <div class="element-picker">
        <dropdown :options="allOptions" @selected="onElementSelected">
            <div class="picked-element" :class="[`picked-element-type-${enrichedElement.type}`]">
                <i :class="enrichedElement.iconClass"/>
                <span class="element-name">{{enrichedElement.name}}</span>
            </div>
        </dropdown>
    </div>
</template>
<script>
/**
 * This component is used in order to pick any element on the scheme (e.g. item, connector)
 */
import Dropdown from '../Dropdown.vue';
import EventBus from './EventBus.js';
import _ from 'lodash';
import shortid from 'shortid';


export default {
    props: {
        element:            {type: String},
        selfItem:           {type: Object},
        schemeContainer:    {type: Object},
        useSelf:            {type: Boolean, default: true},
        allowNone:          {type: Boolean, default: false},
        excludedItemIds:    {type: Array,   default: () => []} // array of items that should be excluded from options
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

            _.forEach(this.schemeContainer.getItems(), item => {
                let itemShouldBeIncluded = true;                

                if (this.excludedItemIds && this.excludedItemIds.length > 0) {
                    itemShouldBeIncluded = _.indexOf(this.excludedItemIds, item.id) >= 0;
                }

                if (itemShouldBeIncluded) {
                    options.push({
                        iconClass: 'fas fa-cube',
                        name: item.name,
                        id: item.id,
                        type: 'item'
                    });
                    if (item.connectors) {
                        _.forEach(item.connectors, (connector, connectorIndex) => {
                            options.push({
                                iconClass: 'fas fa-link',
                                name: connector.name || `${item.name} #${connectorIndex}`,
                                id: connector.id,
                                type: 'connector'
                            });
                        });
                    }
                }
            });

            _.forEach(this.schemeContainer.itemGroups, group => {
                options.push({
                    iconClass: 'fas fa-cubes',
                    name: group,
                    id: group,
                    type: 'item-group'
                });
            });
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
                if (option.type === 'item' || option.type === 'connector') {
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
                    name: 'None',
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

            const elements = this.schemeContainer.findElementsBySelector(this.element, this.selfItem);
            if (elements && elements.length > 0) {
                let firstElement = elements[0];

                let iconClass = 'fas fa-cube';
                let type = 'item';
                if (!firstElement.shape) {
                    iconClass = 'fas fa-link';
                    type = 'connector';
                }
                return {
                    name: firstElement.name || firstElement.id,
                    iconClass,
                    type
                };
            }

            return {
                name: 'no item',
                type: 'error',
                iconClass: 'fas fa-exclamation-triangle'
            };
        }
    }
    
}
</script>