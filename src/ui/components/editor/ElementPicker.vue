<template>
    <div class="item-picker">
        <dropdown :options="allOptions" @selected="onElementSelected">
            <div>
                <i :class="enrichedElement.iconClass"/>
                <span>{{enrichedElement.name}}</span>
            </div>
        </dropdown>
    </div>
</template>
<script>
/**
 * This component is used in order to pick any element on the scheme (e.g. item, connector)
 */
import Dropdown from '../Dropdown.vue';
import _ from 'lodash';

export default {
    props: ['element', 'selfItem', 'schemeContainer'],

    components: {Dropdown},

    data() {
        return {
            allOptions: this.collectAllOptions()
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
                alert('picking is not implemented yet');
            } else {
                if (option.type === 'item') {
                    // this.element.item = option.id;
                    this.$emit('selected', {
                        item: option.id
                    });
                } else {
                    alert('not implemented yet');
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