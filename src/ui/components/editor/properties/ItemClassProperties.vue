<template>
    <div>
        <Dropdown v-if="classOptions.length > 0" :options="classOptions" @selected="onNewClassSelected">Select class</Dropdown>

        <div class="item-class-labels">
            <div v-for="(itemClass, idx) in itemClasses" class="item-class-label">
                {{ itemClass.name }}
                <span class="item-class-delete" @click="deleteItemClass(itemClass.id, idx)"><i class="fas fa-times"></i></span>
            </div>
        </div>

        <div v-for="(itemClass, classIdx) in itemClasses" v-if="itemClass.args.length > 0" class="item-class-args-container">
            <div class="item-class-name-separator">
                <span class="item-class-name">{{ itemClass.name }}</span>
            </div>
            <table class="properties-table">
                <tbody>
                    <tr v-for="(arg, argIdx) in itemClass.args">
                        <td class="label" width="50%">{{ arg.name }}</td>
                        <td class="value" width="50%">
                            <PropertyInput
                                :key="`item-class-arg-property-input-${argIdx}-${arg.type}`"
                                :editorId="editorId"
                                :schemeContainer="schemeContainer"
                                :descriptor="arg.descriptor"
                                :value="arg.value"
                                @input="onClassArgValueChange(classIdx, arg.name, $event)"
                                />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import Modal from '../../Modal.vue';
import Dropdown from '../../Dropdown.vue';
import {find, findIndex} from '../../../collections.js';
import PropertyInput from './PropertyInput.vue';
import EditorEventBus from '../EditorEventBus.js';

export default {
    props: [
        'editorId', 'item', 'schemeContainer'
    ],
    components: { Modal, Dropdown, PropertyInput },

    data() {
        return {
            classOptions: this.buildClassOptions(),
            itemClasses : this.buildItemClasses(),
       };
    },

    methods: {
        onClassArgValueChange(classIdx, argName, value) {
            this.item.classes[classIdx].args[argName] = value;
            for (let i = 0; i < this.schemeContainer.selectedItems.length; i++) {
                const selectedItem = this.schemeContainer.selectedItems[i];
                if (selectedItem.id !== this.item.id && Array.isArray(selectedItem.classes)) {
                    let matchingClass = null;
                    for (let j = 0; j < selectedItem.classes.length & !matchingClass; j++) {
                        if (selectedItem.classes[j].id === this.item.classes[classIdx].id) {
                            matchingClass = selectedItem.classes[j];
                        }
                    }
                    if (matchingClass) {
                        matchingClass.args[argName] = value;
                    }
                }
            }
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.classes.${classIdx}.args.${argName}`);
        },

        buildClassOptions() {
            return this.schemeContainer.scheme.scripts.classes
                // filtering for classes that are not yet used by the item
                .filter(classDef => {
                    if (findIndex(this.item.classes, itemClass => itemClass.id === classDef.id) >= 0) {
                        return false;
                    }

                    if (classDef.shape && classDef.shape !== 'all' && classDef.shape !== this.item.shape) {
                        return false;
                    }
                    return true;
                })
                .map(classDef => {
                return {
                    name: classDef.name,
                    id: classDef.id
                };
            })
        },

        buildItemClasses() {
            if (!Array.isArray(this.item.classes)) {
                return [];
            }
            const classes = [];

            this.item.classes.forEach(itemClass => {
                const classDef = find(this.schemeContainer.scheme.scripts.classes, classDef => classDef.id === itemClass.id);
                if (!classDef) {
                    return;
                }

                classes.push({
                    id: classDef.id,
                    name: classDef.name,
                    args: classDef.args.map(argDef => {
                        return {
                            ...argDef,
                            descriptor: {type: argDef.type},
                            value: itemClass.args && itemClass.args.hasOwnProperty(argDef.name) ? itemClass.args[argDef.name] : argDef.value,
                        };
                    })
                });
            });
            return classes;
        },

        deleteItemClass(classId, idx) {
            this.schemeContainer.selectedItems.forEach(item => {
                for (let i = item.classes.length - 1; i >= 0; i--) {
                    if (item.classes[i].id === classId) {
                        item.classes.splice(i, 1);
                    }
                }
            });
            this.itemClasses.splice(idx, 1);
            this.classOptions = this.buildClassOptions();
        },

        onNewClassSelected({ id }) {
            const classDef = find(this.schemeContainer.scheme.scripts.classes, classDef => classDef.id === id);
            if (!classDef) {
                return;
            }

            this.schemeContainer.selectedItems.forEach(item => {
                if (findIndex(item.classes, itemClass => itemClass.id === classDef.id) >= 0) {
                    // item already has a reference to the same class
                    return;
                }

                const args = {};
                if (Array.isArray(classDef.args)) {
                    classDef.args.forEach(argDef => {
                        args[argDef.name] = argDef.value;
                    });
                }

                item.classes.push({
                    id: classDef.id,
                    args
                });

                this.itemClasses = this.buildItemClasses();
                this.classOptions = this.buildClassOptions();
            });

            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.classes`);
        }
    }
}
</script>