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
        element:            {type: Object},
        selfItem:           {type: Object},
        schemeContainer:    {type: Object},
        useSelf:            {type: Boolean, default: true}
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
            const options = [{
                iconClass: 'fas fa-crosshairs',
                name: 'Pick...',
                id: 'pick',
                type: 'pick'
            }];
            if (this.useSelf) {
                options.push({
                    iconClass: 'fas fa-cube',
                    name: 'self',
                    id: 'self',
                    type: 'item'
                });
            }

            _.forEach(this.schemeContainer.getItems(), item => {
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
            if (option.type === 'pick') {
                this.pickElementRequestId = shortid.generate();
                EventBus.emitElementPickRequested((element) => {
                    this.$emit('selected', element);
                });
            } else {
                if (option.type === 'item') {
                    this.$emit('selected', {
                        item: option.id
                    });
                } else if (option.type === 'connector') {
                    this.$emit('selected', {
                        connector: option.id
                    });
                } else if (option.type === 'item-group') {
                    this.$emit('selected', {
                        itemGroup: option.id
                    });
                } else {
                    console.error(option.type + ' is not supported');
                }
            }
        }
    },

    computed: {
        enrichedElement() {
            if (this.element && this.element.item) {
                let item = null;
                if (this.element.item === 'self') {
                    item = this.selfItem;
                } else {
                    item = this.schemeContainer.findItemById(this.element.item);
                }

                if (item) {
                    return {
                        name: (this.selfItem && this.selfItem.id === item.id) ? 'self' : item.name,
                        type: 'item',
                        iconClass: 'fas fa-cube'
                    };
                } 

                return {
                    name: 'no item',
                    type: 'error',
                    iconClass: 'fas fa-exclamation-triangle'
                };
            }

            if (this.element && this.element.connector) {
                const connector = this.schemeContainer.findConnectorById(this.element.connector);
                if (connector) {
                    return {
                        name: connector.name || connector.id,
                        type: 'connector',
                        iconClass: 'fas fa-link'
                    };
                }

                return {
                    name: 'no connector',
                    type: 'error',
                    iconClass: 'fas fa-exclamation-triangle'
                };
            }
            
            if (this.element && this.element.itemGroup) {
                return {
                    name: this.element.itemGroup,
                    type: 'item-group',
                    iconClass: 'fas fa-cubes'
                };
            }
            return {
                name: '',
                iconClass: 'far fa-file'
            };
        }
    }
    
}
</script>