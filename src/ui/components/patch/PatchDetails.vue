<template>
    <div>
        <div class="label">Origin Doc</div>
        {{originSchemeContainer.scheme.name}}

        <div class="label">Changes</div>

        <div class="patch-label patch-modifications">
            Total modified fields: <span>{{stats.document.fieldChanges + stats.items.modified.count}}</span>
        </div>
        <div class="patch-label patch-additions">
            <span @click="addedItemsCollapsed = !addedItemsCollapsed">
                <i v-if="addedItemsCollapsed" class="fas fa-caret-right"></i>
                <i v-else class="fas fa-caret-down"></i>
            </span>
            New items: <span>{{stats.items.added.count}}</span>
        </div>
        <div v-if="!addedItemsCollapsed">
            <div v-for="item in stats.items.added.items">
                <div> {{item.name}} </div>
            </div>
        </div>
        <div class="patch-label patch-deletions">
            <span @click="deletedItemsCollapsed = !deletedItemsCollapsed">
                <i v-if="deletedItemsCollapsed" class="fas fa-caret-right"></i>
                <i v-else class="fas fa-caret-down"></i>
            </span>
            Deleted items: <span>{{stats.items.deleted.count}}</span>
        </div>
        <div v-if="!deletedItemsCollapsed">
            <div v-for="item in stats.items.deleted.items">
                <div> {{item.name}} </div>
            </div>
        </div>
        <div class="patch-label patch-modifications">
            <span @click="modifiedItemsCollapsed = !modifiedItemsCollapsed">
                <i v-if="modifiedItemsCollapsed" class="fas fa-caret-right"></i>
                <i v-else class="fas fa-caret-down"></i>
            </span>
            Modified items: <span>{{stats.items.modified.items.length}}</span>
        </div>
        <div v-if="!modifiedItemsCollapsed">
            <div v-for="item in stats.items.modified.items">
                <div>
                    <span @click="item.collapsed = !item.collapsed">
                        <i v-if="item.collapsed" class="fas fa-caret-right"></i>
                        <i v-else class="fas fa-caret-down"></i>
                        {{item.name}} <span>{{item.fields.length}}</span>
                    </span>
                    <div v-if="!item.collapsed">
                        <ul>
                            <li v-for="field in item.fields">{{field}}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { generatePatchStatistic } from '../../scheme/SchemePatch';
import forEach from 'lodash/forEach';
import map from 'lodash/map';

function enrichStats(stats, originSchemeContainer, modifiedSchemeContainer) {

    forEach(stats.items.modified.items, item => {
        item.collapsed = true;
        const indexedItem = originSchemeContainer.findItemById(item.id);
        if (indexedItem) {
            item.name = indexedItem.name;
        }
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