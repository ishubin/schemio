<template>
    <div>
        <div class="label">Origin Doc</div>
        {{originSchemeContainer.scheme.name}}

        <div class="label">Changes</div>

        <div class="patch-label patch-modifications">
            Total modified fields: <span>{{stats.document.fieldChanges + stats.items.modified.count}}</span>
        </div>
        <div class="patch-label patch-additions">
            New items: <span>{{stats.items.added.count}}</span>
        </div>
        <div class="patch-label patch-deletions">
            Deleted items: <span>{{stats.items.deleted.count}}</span>
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

function enrichStats(stats, originSchemeContainer) {

    forEach(stats.items.modified.items, item => {
        item.collapsed = true;
        const indexedItem = originSchemeContainer.findItemById(item.id);
        if (indexedItem) {
            item.name = indexedItem.name;
        }
    });
    return stats;
}


export default {
   props: ['patch', 'originSchemeContainer'],

   beforeMount() {
        this.stats = enrichStats(generatePatchStatistic(this.patch), this.originSchemeContainer);
   },
   data() {
       return {
            stats                 : null,
            modifiedItemsCollapsed: true,
       };
   }
}
</script>