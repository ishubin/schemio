<template>
    <div>
        <div class="ctrl-label">Origin Doc</div>
        {{originSchemeContainer.scheme.name}}

        <div class="ctrl-label">Changes</div>

        <div class="patch-label">
            Total modified fields: <span>{{stats.document.fieldChanges + stats.items.modified.count}}</span>
        </div>

        <div class="patch-additions section">
            <div class="patch-label clickable" @click="addedItemsCollapsed = !addedItemsCollapsed">
                <span class="patch-expander">
                    <i v-if="addedItemsCollapsed" class="fas fa-caret-right"></i>
                    <i v-else class="fas fa-caret-down"></i>
                </span>
                New items: <span>{{stats.items.added.count}}</span>
            </div>
            <div class="patch-items-container" v-if="!addedItemsCollapsed">
                <div v-for="item in stats.items.added.items">
                    <div><i class="fas fa-cube"></i> {{item.name}} </div>
                </div>
            </div>
        </div>
        
        <div class="patch-deletions section">
            <div class="patch-label clickable" @click="deletedItemsCollapsed = !deletedItemsCollapsed">
                <span class="patch-expander">
                    <i v-if="deletedItemsCollapsed" class="fas fa-caret-right"></i>
                    <i v-else class="fas fa-caret-down"></i>
                </span>
                Deleted items: <span>{{stats.items.deleted.count}}</span>
            </div>
            <div class="patch-items-container" v-if="!deletedItemsCollapsed">
                <div v-for="item in stats.items.deleted.items">
                    <div><i class="fas fa-cube"></i> {{item.name}} </div>
                </div>
            </div>
        </div>

        <div class="patch-modifications section">
            <div class="patch-label clickable" @click="modifiedItemsCollapsed = !modifiedItemsCollapsed">
                <span class="patch-expander">
                    <i v-if="modifiedItemsCollapsed" class="fas fa-caret-right"></i>
                    <i v-else class="fas fa-caret-down"></i>
                </span>
                Modified items: <span>{{stats.items.modified.items.length}}</span>
            </div>
            <div class="patch-items-container" v-if="!modifiedItemsCollapsed">
                <div v-for="item in stats.items.modified.items">
                    <div>
                        <div @click="item.collapsed = !item.collapsed" class="clickable">
                            <span class="patch-expander">
                                <i v-if="item.collapsed" class="fas fa-caret-right"></i>
                                <i v-else class="fas fa-caret-down"></i>
                            </span>
                            <i class="fas fa-cube"></i> {{item.name}} <span>{{item.fields.length}}</span>
                        </div>
                        <div v-if="!item.collapsed">
                            <ul class="patch-field-list">
                                <li v-for="field in item.fields"><i class="fas fa-cog"></i> {{field}}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { generatePatchStatistic } from '../../scheme/SchemePatch';
import { prettyTextSlotProperty } from '../../scheme/Item';
import {forEach, map} from '../../collections';
import Shape from '../editor/items/shapes/Shape';

function prettyItemFieldName(itemId, fieldPath, schemeContainer) {
    const path = fieldPath.split('.');

    if (path[0] === 'shapeProps' && path.length > 1) {
        const item = schemeContainer.findItemById(itemId);
        if (!item) {
            return null;
        }
        const shape = Shape.find(item.shape);
        if (!shape) {
            return null;
        }

        const descriptor = Shape.getShapePropDescriptor(shape, path[1]);
        if (descriptor) {
            return descriptor.name;
        }
    } else if (path[0] === 'textSlots' && path.length > 2) {
        return `Text / ${path[1]} / ${prettyTextSlotProperty(path[2])}`;
    } else {
        return path[0];
    }
    return null;
}

function enrichStats(stats, originSchemeContainer, modifiedSchemeContainer) {

    forEach(stats.items.modified.items, item => {
        item.collapsed = true;
        const indexedItem = originSchemeContainer.findItemById(item.id);
        if (indexedItem) {
            item.name = indexedItem.name;
        }

        const uniqueFields = new Set();
        forEach(item.fields, fieldPath => {
            let prettyName = prettyItemFieldName(item.id, fieldPath, modifiedSchemeContainer);
            if (!prettyName) {
                prettyName = prettyItemFieldName(item.id, fieldPath, originSchemeContainer);
            }
            if (prettyName) {
                uniqueFields.add(prettyName);
            } else {
                uniqueFields.add(fieldPath);
            }
        })

        item.fields = Array.from(uniqueFields);
    });

    const mapItemIds = (items, schemeContainer) => {
        return map(items, itemId => {
            const item = schemeContainer.findItemById(itemId);
            if (item) {
                return {
                    id: itemId,
                    name: item.name
                };
            } else {
                return {
                    id: itemId,
                    name: 'Unknown item'
                }
            }
        });
    }

    stats.items.added.items = mapItemIds(stats.items.added.items, modifiedSchemeContainer);
    stats.items.deleted.items = mapItemIds(stats.items.deleted.items, originSchemeContainer);


    return stats;
}


export default {
   props: ['patch', 'originSchemeContainer', 'modifiedSchemeContainer'],

   beforeMount() {
        this.stats = enrichStats(generatePatchStatistic(this.patch), this.originSchemeContainer, this.modifiedSchemeContainer);
   },
   data() {
       return {
            stats                 : null,
            addedItemsCollapsed   : true,
            deletedItemsCollapsed : true,
            modifiedItemsCollapsed: true,
       };
   }
}
</script>