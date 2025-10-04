<template>
    <div>
        <div class="hint hint-small" v-if="!item.effects || item.effects.length === 0">There are no effects yet</div>
        <ul class="effects-list" v-else>
            <li v-for="(effect, effectIndex) in item.effects"
                @mousedown="onEffectMouseDown($event, effectIndex)"
                class="effect-dropable"
                :class="{'dragged-effect': dragging.isDragging && dragging.srcIdx === effectIndex, 'effect-drop-destination': dragging.dstIdx === effectIndex, 'effect-drop-above': dragging.dstIdx === effectIndex && dragging.above, 'effect-drop-below': dragging.dstIdx === effectIndex && !dragging.above}"
                :data-effect-index="effectIndex"
                >
                <div class="effect-entry-container">
                    <div class="effect-name" @click="openEditEffectModal(effectIndex)">{{ prettyEffectName(effect.name) }}</div>

                    <div class="effect-right-panel">
                        <span class="icon icon-effect-edit" @click="openEditEffectModal(effectIndex)">
                            <i class="fas fa-edit"></i>
                        </span>
                        <span class="icon icon-effect-delete" @click="deleteEffect(effectIndex)">
                            <i class="fas fa-times"></i>
                        </span>
                    </div>
                </div>
            </li>
        </ul>

        <div ref="effectDragPreview" class="effect-drag-preview" :style="{display: dragging.isDragging ? 'inline-block' : 'none' }">
            {{ dragging.name }}
        </div>

        <span class="btn btn-secondary" @click="startAddingEffect">Add Effect</span>

        <EditEffectModal v-if="editEffectModal.shown"
            :key="`edit-effect-modal-${item.id}-${editEffectModal.currentEffectIndex}-${editEffectModal.effectId}`"
            :editorId="editorId"
            :isAdding="editEffectModal.isAdding"
            :name="editEffectModal.name"
            :cascade="editEffectModal.cascade"
            :effectId="editEffectModal.effectId"
            :effectArgs="editEffectModal.effectArgs"
            :schemeContainer="schemeContainer"
            @close="effectModalClosed"
            @effect-submited="onEffectSubmited"
            @effect-arg-changed="onEffectArgChanged"
            @effect-name-changed="onEffectNameChanged"
            @effect-id-changed="onEffectIdChanged"
            @effect-cascade-changed="onEffectCascadeChanged"
            />
    </div>
</template>

<script>
import EditEffectModal from '../../effects/EditEffectModal.vue';
import shortid from 'shortid';
import { findEffect, generateEffectArgs, getDefaultEffectId } from '../../effects/Effects';
import { traverseItems } from '../../../scheme/Item';
import EditorEventBus from '../EditorEventBus';
import { giveUniqueName } from '../../../collections';
import { dragAndDropBuilder } from '../../../dragndrop';

export default {
    props: ['editorId', 'item', 'schemeContainer'],
    components: {EditEffectModal},

    data() {
        return {
            editEffectModal: {
                effectId: 'drop-shadow',
                name : '',
                cascade: false,
                isAdding: true,
                shown: false,
                currentEffectIndex: -1,
                effectArgs: {}
            },
            dragging: {
                srcIdx: -1,
                dstIdx: -1,
                name: '',
                isDragging: false,
                above: false
            }
        };
    },

    methods: {
        onEffectMouseDown(event, effectIdx) {
            dragAndDropBuilder(event)
            .withDraggedElement(this.$refs.effectDragPreview)
            .withDroppableClass('effect-dropable')
            .onDragStart(() => {
                this.dragging.srcIdx = effectIdx;
                this.dragging.name = this.item.effects[effectIdx].name;
                this.dragging.isDragging = true;
            })
            .onDone(() => {
                if (this.dragging.dstIdx >= 0 && this.dragging.srcIdx >= 0) {
                    let dstIdx = this.dragging.dstIdx;
                    if (dstIdx > this.dragging.srcIdx) {
                        dstIdx -= 1;
                    }
                    if (!this.dragging.above) {
                        dstIdx += 1;
                    }
                    this.updateCurrentItem('effects', (item) => {
                        const effect = item.effects[this.dragging.srcIdx];
                        item.effects.splice(this.dragging.srcIdx, 1);
                        item.effects.splice(dstIdx, 0, effect);
                        EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.effects`);
                    });
                }
                this.dragging.srcIdx = -1;
                this.dragging.dstIdx = -1;
                this.dragging.name = '';
                this.dragging.isDragging = false;
            })
            .onDragOver((event, element) => {
                const dstIdx = element.getAttribute('data-effect-index');
                if (!dstIdx) {
                    return;
                }
                this.dragging.dstIdx = parseInt(dstIdx);
                const bbox = element.getBoundingClientRect();
                this.dragging.above = event.clientY < bbox.top + bbox.height/2;
            })
            .build();
        },

        updateCurrentItem(property, callback) {
            this.schemeContainer.updateItem(this.item.id, property, callback);
        },

        startAddingEffect() {
            this.updateCurrentItem('effects', item => {
                const effectId = getDefaultEffectId();
                const effect = findEffect(effectId);
                this.editEffectModal.effectArgs = generateEffectArgs(effect);
                const name = this.ensureUniqueEffectName(effect.name);
                this.editEffectModal.name = name;
                item.effects.push({
                    id: shortid.generate(),
                    effect: effectId,
                    name: name,
                    cascade: false,
                    args: this.editEffectModal.effectArgs
                });
                this.editEffectModal.isAdding = true;
                this.editEffectModal.effectId = effectId;
                this.editEffectModal.shown = true;
                this.editEffectModal.currentEffectIndex = item.effects.length - 1;
            });
        },

        ensureUniqueEffectName(effectName) {
            if (!Array.isArray(this.item.effects)) {
                return effectName;
            }
            const allNames = this.item.effects.map(effect => effect.name);
            return giveUniqueName(effectName, allNames);
        },

        effectModalClosed() {
            const effectIdx = this.editEffectModal.currentEffectIndex;
            this.updateCurrentItem(`effects.${effectIdx}`, item => {
                if (this.editEffectModal.isAdding) {
                    if (effectIdx >= 0 && effectIdx < item.effects.length) {
                        item.effects.splice(effectIdx, 1);
                    }
                }
            });
            this.editEffectModal.shown = false;
            this.editEffectModal.currentEffectIndex = -1;
        },

        onEffectArgChanged(argName, value) {
            const effectIdx = this.editEffectModal.currentEffectIndex;
            this.updateCurrentItem(`effects.${effectIdx}.args.${argName}`, item => {
                if (effectIdx >= 0 && effectIdx < item.effects.length) {
                    item.effects[effectIdx].args[argName] = value;
                }
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
                if (!this.editEffectModal.isAdding) {
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.effects`);
                }
            });
        },

        onEffectCascadeChanged(cascade) {
            const effectIdx = this.editEffectModal.currentEffectIndex;
            this.updateCurrentItem(`effects.${effectIdx}`, item => {
                if (effectIdx >= 0 && effectIdx < item.effects.length) {
                    item.effects[effectIdx].cascade = cascade;
                }
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
                if (!this.editEffectModal.isAdding) {
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.effects.${effectIdx}.cascade`);
                }
            });
        },

        onEffectNameChanged(name) {
            const effectIdx = this.editEffectModal.currentEffectIndex;
            this.updateCurrentItem(`effects.${effectIdx}`, item => {
                if (effectIdx >= 0 && effectIdx < item.effects.length) {
                    item.effects[effectIdx].name = name;
                }
                if (!this.editEffectModal.isAdding) {
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.effects.${effectIdx}.name`);
                }
            });
        },

        onEffectSubmited(effect) {
            this.editEffectModal.shown = false;
            const effectIdx = this.editEffectModal.currentEffectIndex;
            this.updateCurrentItem(`effects.${effectIdx}`, item => {
                if (this.editEffectModal.isAdding) {
                    if (effectIdx >= 0 && effectIdx < item.effects.length) {
                        item.effects[effectIdx] = effect;
                    }
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.effects`);
                }
            });
        },

        openEditEffectModal(idx) {
            this.editEffectModal.currentEffectIndex = idx;
            this.editEffectModal.effectId = this.item.effects[idx].effect;
            this.editEffectModal.name = this.item.effects[idx].name;
            this.editEffectModal.cascade = this.item.effects[idx].cascade;
            this.editEffectModal.isAdding = false;
            this.editEffectModal.shown = true;
            this.editEffectModal.effectArgs = this.item.effects[idx].args;
        },

        deleteEffect(idx) {
            this.updateCurrentItem(`effects.${idx}`, item => {
                if (idx < 0 || idx >= item.effects.length) {
                    return;
                }
                this.deleteAllReferencesToEffect(item.id, item.effects[idx].id);
                item.effects.splice(idx, 1);
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.effects`);
            });
        },

        onEffectIdChanged(newEffectId) {
            this.updateCurrentItem(`effects`, item => {
                if (this.editEffectModal.currentEffectIndex < 0 || this.editEffectModal.currentEffectIndex >= item.effects.length) {
                    return;
                }

                const effect = findEffect(newEffectId);
                this.editEffectModal.effectArgs = generateEffectArgs(effect);
                const name = this.ensureUniqueEffectName(effect.name);
                this.editEffectModal.name = name;
                this.editEffectModal.effectId = newEffectId;
                item.effects[this.editEffectModal.currentEffectIndex] = {
                    id: item.effects[this.editEffectModal.currentEffectIndex].id,
                    effect: newEffectId,
                    name: name,
                    args: this.editEffectModal.effectArgs
                };
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.effects`);
            });
        },

        deleteAllReferencesToEffect(itemId, effectId) {
            const fieldPrefix = `effects.${effectId}`;

            traverseItems(this.schemeContainer.scheme.items, item => {
                if (!item.behavior || !Array.isArray(item.behavior.events)) {
                    return;
                }

                item.behavior.events.forEach(event => {
                    if (!Array.isArray(event.actions)) {
                        return;
                    }

                    for (let i = event.actions.length - 1; i >= 0; i--) {
                        const action = event.actions[i];
                        if (action.method === 'set' && action.args.field.startsWith(fieldPrefix)
                            && ((item.id === item.id && action.element === 'self') || action.element === '#' + itemId)) {
                            event.actions.splice(i, 1);
                        }
                    }
                });
            });
        },

        prettyEffectName(name) {
            if (!name) {
                return 'Unnamed Effect';
            }
            return name;
        }
    },
}
</script>