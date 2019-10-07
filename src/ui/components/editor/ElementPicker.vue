<template>
    <div class="element-picker">
        <dropdown :options="allOptions" @selected="onElementSelected">
            <div>
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
    props: ['element', 'selfItem', 'schemeContainer'],

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
            return [{
                iconClass: 'fas fa-crosshairs',
                name: 'Pick...',
                id: 'pick',
                type: 'pick'
            },{
                iconClass: 'fas fa-cube',
                name: 'self',
                id: 'self',
                type: 'item'
            }].concat(_.map(this.schemeContainer.getItems(), item => {
                return {
                    iconClass: 'fas fa-cube',
                    name: item.name,
                    id: item.id,
                    type: 'item'
                };
            }));
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
                } else {
                    console.error(option.type + ' not implemented yet');
                }
            }
        }
    },

    computed: {
        enrichedElement() {
            if (this.element.item) {
                let name = null;
                if (this.element.item === 'self') {
                    name = 'self';
                } else {
                    const item = this.schemeContainer.findItemById(this.element.item);
                    if (item) {
                        name = item.name;
                    }
                }
                if (name !== null) {
                    return {
                        name: name,
                        type: 'item',
                        iconClass: 'fas fa-cube'
                    };
                } else {
                    return {
                        name: 'Missing item!!!!',
                        type: 'item',
                        iconClass: 'fas fa-cube'
                    };
                }
            }
            return {
                name: 'page',
                type: 'item',
                iconClass: 'far fa-file'
            };
        }
    }
    
}
</script>