<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="element-picker" :class="{disabled: disabled}">
        <dropdown :options="allOptions"
            :disabled="disabled"
            :inline="inline"
            :borderless="borderless"
            @selected="onElementSelected"
            @dropdown-toggled="onDropdownToggled"
            @dropdown-hidden="onDropdownHidden"
            >
            <div class="picked-element" :class="[`picked-element-type-${enrichedElement.type}`, disabled?'disabled': '']">
                <i :class="enrichedElement.iconClass"/>
                <span class="element-name">{{toShortName(enrichedElement.name)}}</span>
            </div>
        </dropdown>
    </div>
</template>
<script>
/**
 * This component is used in order to pick any item on the scheme
 */
import Dropdown from '../Dropdown.vue';
import {forEach, indexOf} from '../../collections';
import EditorEventBus from './EditorEventBus';

const maxNameSymbols = 20;

export function generateEnrichedElement(element, schemeContainer) {
    if (!element) {
        return {
            name: 'None',
            type: 'none',
            iconClass: ''
        };
    }
    if (element.startsWith('tag:')) {
        return {
            name: element.substr(5).trim(),
            type: 'item-tag',
            iconClass: 'fas fa-cubes'
        };
    }
    if (element === 'self') {
        return {
            name: 'self',
            iconClass: 'fas fa-cube',
            type: 'item'
        };
    }

    const elementItem = schemeContainer.findFirstElementBySelector(element);
    if (elementItem) {
        return {
            name: elementItem.name || elementItem.id,
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

export default {
    props: {
        editorId:           {type: String, required: true},
        element:            {type: String,  default: null},
        selfItem:           {type: Object,  default: null},
        schemeContainer:    {type: Object,  required: true},
        useSelf:            {type: Boolean, default: true},
        allowNone:          {type: Boolean, default: false},
        allowTags:          {type: Boolean, default: true},
        excludedItemIds:    {type: Array,   default: () => []}, // array of items that should be excluded from options
        disabled:           {type: Boolean, default: false},
        inline:             {type: Boolean, default: false},
        borderless:         {type: Boolean, default: false},
    },

    components: {Dropdown},

    mounted() {
    },

    beforeDestroy() {
        EditorEventBus.elementPick.canceled.$emit(this.editorId);
    },

    data() {
        return {
            allOptions: this.collectAllOptions(),
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

            if (this.allowTags) {
                forEach(this.schemeContainer.itemTags, tag => {
                    options.push({
                        iconClass: 'fas fa-cubes',
                        name: tag,
                        id: tag,
                        type: 'item-tag'
                    });
                });
            }

            return options;
        },

        onElementSelected(option) {
            if (option.id === 'self') {
                this.$emit('selected', 'self');
            } else {
                if (option.type === 'item') {
                    this.$emit('selected', `#${option.id}`);
                } else if (option.type === 'item-tag') {
                    this.$emit('selected', `tag: ${option.id}`);
                } else if (option.type === 'none') {
                    this.$emit('selected', null);
                } else {
                    console.error(option.type + ' is not supported');
                }
            }
        },

        onDropdownToggled() {
            EditorEventBus.elementPick.requested.$emit(this.editorId, (element) => {
                this.$emit('selected', element);
            });
        },

        onDropdownHidden() {
            EditorEventBus.elementPick.canceled.$emit(this.editorId);
        },

        toShortName(name) {
            // tried to use overflow: hidden but it din't work out
            // I hate CSS so have to use this function :(
            if (name.length > maxNameSymbols) {
                return name.substr(0, maxNameSymbols - 1) + '…';
            }
            return name;
        }
    },

    computed: {
        enrichedElement() {
            return generateEnrichedElement(this.element, this.schemeContainer);
        }
    },
}
</script>