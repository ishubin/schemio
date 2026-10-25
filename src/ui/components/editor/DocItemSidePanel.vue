<template>
    <div class="doc-and-item-panel">
        <div v-if="collapsedMode" class="collapsed-mode">
            <span class="menu-icon" title="Doc" @click="focusPanel('Doc')">
                <i class="icon fa-solid fa-file-lines"></i>
            </span>

            <template v-if="mode === 'edit'">
                <span class="menu-icon" title="Items" @click="focusPanel('Item')">
                    <i class="fa-solid fa-cubes"></i>
                </span>

                <template v-if="schemeContainer.selectedItems.length > 0">
                    <span v-for="tab in allItemPropertyTabs" class="menu-icon" :title="tab.displayName" @click="focusItemPanel(tab.name)">
                        <i :class="tab.icon"></i>
                    </span>
                </template>
            </template>
        </div>

        <template v-else>
            <ul v-if="state === 'draw'" class="tabs text-nonselectable">
                <li><span class="tab active">Draw</span></li>
            </ul>
            <ul v-else-if="width > 10" class="tabs">
                <li v-for="tab in tabs">
                    <span class="tab"
                        :class="{active: currentTab === tab}"
                        @click="changeTab(tab)"
                        >{{tab}}</span>
                </li>
                <li v-for="tab in extraTabs">
                    <div class="tab"
                        :class="{active: currentTab === `extra:${tab.name}`}"
                        @click="changeTab(`extra:${tab.name}`)"
                        >
                        <i v-if="tab.icon" class="tab-icon" :class="tab.icon"></i>
                        <span v-else>{{tab.name}}</span>
                        <span v-if="tab.count">({{tab.count}})</span>
                    </div>
                </li>
                <li v-for="itemTextSlotTab in itemTextSlotsAvailable" v-if="mode === 'edit'">
                    <span class="tab"
                        :class="{active: currentTab === itemTextSlotTab.tabName}"
                        @click="changeTab(itemTextSlotTab.tabName)"
                        >&#167; {{itemTextSlotTab.slotName}}</span>
                </li>
                <li v-if="mode !== 'view' && selectedTemplateRef && selectedTemplateRootItem">
                    <span class="tab"
                        :class="{active: currentTab === 'template'}"
                        @click="changeTab('template')"
                        ><i class="fa-solid fa-scroll"></i>Template</span>
                </li>
            </ul>
            <div class="tabs-body">
            </div>
            <div class="side-panel-overflow">
                <div v-if="state === 'draw'">
                    <DrawingControlsPanel
                        :isBrush="isDrawingBrush"
                        @color-picked="$emit('draw-color-picked', $event)"
                        @stop-drawing-requested="$emit('stop-drawing-requested')"
                        />
                </div>
                <div v-else>
                    <div v-if="currentTab === 'Doc'">
                        <SchemeProperties v-if="mode === 'edit'"
                            :scheme-container="schemeContainer"
                            :editorId="editorId"
                            :schemeTagsEnabled="schemeTagsEnabled"
                            @delete-diagram-requested="$emit('delete-diagram-requested')"/>

                        <SchemeDetails v-else :scheme="schemeContainer.scheme"/>
                    </div>
                    <div v-if="currentTab === 'Item'">
                        <div v-if="mode === 'edit'">
                            <panel name="Items" :border="false">
                                <ItemSelector
                                    :editorId="editorId"
                                    :scheme-container="schemeContainer"
                                    :min-height="200"
                                    :revision="`${schemeRevision}-${schemeContainer.revision}`"
                                    @item-right-clicked="onItemRightClick"/>
                            </panel>

                            <ItemProperties v-if="schemeContainer.selectedItems.length > 0"
                                :key="`${schemeRevision}-${schemeContainer.selectedItems[0].id}-${schemeContainer.selectedItems[0].shape}`"
                                :editorId="editorId"
                                :item="schemeContainer.selectedItems[0]"
                                :revision="schemeRevision"
                                :schemeContainer="schemeContainer"
                                :userStylesEnabled="userStylesEnabled"
                                :currentTab="currentItemPropertiesTab"
                                @shape-prop-changed="onItemShapePropChanged"
                                @item-field-changed="onItemFieldChanged"
                                @item-style-applied="onItemStyleApplied"
                                @shape-changed="onItemShapeChanged"
                                @tab-selected="onItemPropertiesTabSelected"
                            />
                        </div>

                        <ItemDetails v-if="sidePanelItemForViewMode && mode === 'view'" :item="sidePanelItemForViewMode"/>
                    </div>
                    <div v-if="mode !== 'view' && currentTab === 'template' && selectedTemplateRootItem && selectedTemplateRef">
                        <TemplateProperties
                            :key="`${schemeRevision}-${selectedTemplateRootItem.id}-${selectedTemplateRootItem.shape}-${templatePropertiesKey}`"
                            :editorId="editorId"
                            :item="selectedTemplateRootItem"
                            :schemeContainer="schemeContainer"
                            :templateRef="selectedTemplateRef"
                            @updated="onTemplatePropertiesUpdated"
                            @break-template="breakTemplate"
                            @update-template="updateTemplate"
                            @template-rebuild-requested="onTemplateRebuildRequested"
                        />
                    </div>

                    <div>
                        <TextSlotProperties v-for="itemTextSlot in itemTextSlotsAvailable" v-if="mode === 'edit' && currentTab === itemTextSlot.tabName"
                            :key="`text-slot-${itemTextSlot.item.id}-${itemTextSlot.slotName}`"
                            :editorId="editorId"
                            :item="itemTextSlot.item"
                            :slot-name="itemTextSlot.slotName"
                            @moved-to-slot="onTextSlotMoved(itemTextSlot.item, itemTextSlot.slotName, $event);"
                            @property-changed="onTextPropertyChanged(itemTextSlot.slotName, $event.name, $event.value)"
                            />
                        <component
                            v-for="tab in extraTabs"
                            v-if="currentTab === `extra:${tab.name}`"
                            :key="`tab-${currentTab}`"
                            :is="tab.component"
                            :mode="mode"
                            @tab-event="$emit('custom-tab-event', $event)"
                        />
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>


<script>
import { createSettingStorageFromLocalStorage } from '../../LimitedSettingsStorage.js';
import { traverseItems } from '../../scheme/Item.js';
import DrawingControlsPanel from '../DrawingControlsPanel.vue';
import EditorEventBus from './EditorEventBus.js';
import ItemDetails from './ItemDetails.vue';
import { breakItemTemplate } from './items/ItemTemplate.js';
import ItemSelector from './ItemSelector.vue';
import Panel from './Panel.vue';
import ItemProperties, { ALL_ITEM_PROPERTY_TABS } from './properties/ItemProperties.vue';
import TemplateProperties from './properties/TemplateProperties.vue';
import TextSlotProperties from './properties/TextSlotProperties.vue';
import SchemeDetails from './SchemeDetails.vue';
import SchemeProperties from './SchemeProperties.vue';

const itemTabsSettingsStorage = createSettingStorageFromLocalStorage('tabs-state', 100);

export default {
    props: {
        editorId                : {type: String, required: true},
        mode                    : {type: String, required: true},
        state                   : {type: String, required: true},
        schemeContainer         : {type: Object, required: true},
        curveEditing            : {type: Object, required: true},
        collapsedMode           : {type: Boolean, default: false},
        width                   : {type: Number, required: true},
        currentTab              : {type: String, required: true},
        extraTabs               : {type: Array, default: () => []},
        itemTextSlotsAvailable  : {type: Array, required: true},
        selectedTemplateRef     : {type: String, default: null},
        selectedTemplateRootItem: {type: Object, default: null},
        sidePanelItemForViewMode: {type: Object, default: null},
        templatePropertiesKey   : {type: Number, required: true},
        isDrawingBrush          : {type: Boolean, required: true},
        schemeTagsEnabled       : {type: Boolean, default: true},
        schemeRevision          : {type: Number, required: true},
        userStylesEnabled       : {type: Boolean, default: false},
    },

    components: {
        TemplateProperties, TextSlotProperties, Panel, ItemProperties, ItemDetails,
        ItemSelector, SchemeProperties, DrawingControlsPanel, SchemeDetails
    },

    data() {
        return {
            tabs: [ 'Doc', 'Item' ],
            currentItemPropertiesTab: 'shape',
            allItemPropertyTabs: ALL_ITEM_PROPERTY_TABS
        };
    },

    methods: {
        onItemPropertiesTabSelected(tab) {
            this.currentItemPropertiesTab = tab;
        },

        onTextPropertyChanged(textSlotName, propertyName, value) {
            this.$emit('text-property-changed', textSlotName, propertyName, value);
        },

        onTextSlotMoved(item, slotName, anotherSlotName) {
            this.$emit('move-text-slot', item, slotName, anotherSlotName);
        },

        onTemplateRebuildRequested(originItemId, template, templateArgs) {
            this.$emit('template-rebuild-requested', originItemId, template, templateArgs);
        },

        updateTemplate(originItemId, template, templateArgs) {
            this.$emit('update-template', originItemId, template, templateArgs);
        },

        breakTemplate(rootItem) {
            const selectedItem = this.schemeContainer.selectedItems.length > 0 ? this.schemeContainer.selectedItems[0] : null;
            this.schemeContainer.deselectAllItems();
            breakItemTemplate(rootItem);
            this.schemeContainer.reindexItems();
            traverseItems([rootItem], item => {
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
            });
            this.$emit('template-broken');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            if (selectedItem) {
                this.schemeContainer.selectItem(selectedItem);
            }
        },

        onTemplatePropertiesUpdated(originItemId, template, templateArgs, changedArgName) {
            this.$emit('template-properties-updated', originItemId, template, templateArgs, changedArgName);
        },

        onItemShapeChanged(shapeName) {
            this.$emit('shape-changed', shapeName);
        },

        onItemStyleApplied(style) {
            this.$emit('item-style-applied', style);
        },

        onItemFieldChanged(name, value) {
            this.$emit('item-field-changed', name, value);
        },

        onItemShapePropChanged(name, type, value) {
            this.$emit('shape-prop-changed', name, type, value);
        },

        changeTab(tab) {
            this.$emit('tab-selected', tab);
        },

        focusPanel(tab) {
            this.changeTab(tab);
            this.$emit('panel-expanded');
        },

        focusItemPanel(tab) {
            this.currentItemPropertiesTab = tab;
            this.focusPanel('Item');
        },

        onItemRightClick(item, mouseX, mouseY) {
            this.$emit('item-right-clicked', item, mouseX, mouseY);
        }
    },

    watch: {
        currentItemPropertiesTab(tab) {
            itemTabsSettingsStorage.save(this.schemeContainer.scheme.id, tab);
        }
    }
}
</script>