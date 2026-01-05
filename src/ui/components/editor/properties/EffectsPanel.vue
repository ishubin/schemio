<template>
    <div>
        <div>
            <span class="btn btn-secondary" @click="copyAllEffects()">Copy all effects</span>
            <span class="btn btn-secondary" @click="pasteCopiedEffects()">Paste effects</span>
        </div>
        <div class="hint hint-small" v-if="!item.effects || item.effects.length === 0">There are no effects yet</div>
        <ul class="effects-list" v-else>
            <li v-for="(effect, effectIndex) in item.effects"
                @mousedown="onEffectMouseDown($event, effectIndex)"
                class="effect-dropable"
                :class="{'dragged-effect': dragging.isDragging && dragging.srcIdx === effectIndex, 'effect-drop-destination': dragging.dstIdx === effectIndex, 'effect-drop-above': dragging.dstIdx === effectIndex && dragging.above, 'effect-drop-below': dragging.dstIdx === effectIndex && !dragging.above}"
                :data-effect-index="effectIndex"
                >
                <div class="effect-entry-container">
                    <div class="effect-name" @click="openEditEffectModal(effectIndex)">{{effect.name | prettyEffectName}}</div>

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
            :key="`edit-effect-modal-${item.id}-${editEffectModal.itemEffectId}-${editEffectModal.effectId}`"
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
import utils from '../../../utils';
import myMath from '../../../myMath';
import { copyObjectToClipboard, getObjectFromClipboard } from '../../../clipboard';
import StoreUtils from '../../../store/StoreUtils';

export default {
    props: ['editorId', 'item', 'schemeContainer'],
    components: {EditEffectModal},

    data() {
        return {
            editEffectModal: {
                effectId: 'drop-shadow',
                // id of effect entry in effects array
                itemEffectId: '',
                name : '',
                cascade: false,
                isAdding: true,
                shown: false,
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
                    const diffIdx = dstIdx - this.dragging.srcIdx;

                    this.updateEveryItemsEffect((item, effectIdx) => {
                        const itemDstIdx = myMath.clamp(effectIdx + diffIdx, 0, item.effects.length - 1);
                        if (itemDstIdx == effectIdx) {
                            return;
                        }

                        const effect = item.effects[effectIdx];
                        item.effects.splice(effectIdx, 1);
                        item.effects.splice(itemDstIdx, 0, effect);
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

        startAddingEffect() {
            const effectId = getDefaultEffectId();
            const effect = findEffect(effectId);
            this.editEffectModal.effectArgs = generateEffectArgs(effect);
            const name = this.ensureUniqueEffectName(effect.name);
            this.editEffectModal.name = name;

            const itemEffect = {
                id: shortid.generate(),
                effect: effectId,
                name: name,
                cascade: false,
                args: this.editEffectModal.effectArgs
            };

            this.schemeContainer.getSelectedItems().forEach(item => {
                if (!Array.isArray(item.effects)) {
                    item.effects = [];
                }
                this.schemeContainer.updateItem(item.id, 'effects', item => {
                    item.effects.push(utils.clone(itemEffect));
                });
            });
            this.editEffectModal.isAdding = true;
            this.editEffectModal.effectId = effectId;
            this.editEffectModal.itemEffectId = itemEffect.id;
            this.editEffectModal.shown = true;
        },

        ensureUniqueEffectName(effectName) {
            if (!Array.isArray(this.item.effects)) {
                return effectName;
            }
            const allNames = this.item.effects.map(effect => effect.name);
            return giveUniqueName(effectName, allNames);
        },

        findItemEffectIndexByIdOrEffect(item, effectId, effect) {
            let byTypeIdx = -1;
            let idx = -1;
            for (let i = item.effects.length - 1; i >= 0; i--) {
                if (item.effects[i].id === effectId) {
                    idx = i;
                    break;
                }
                if (item.effects[i].effect === effectId) {
                    byTypeIdx = i;
                }
            }

            if (idx < 0) {
                return byTypeIdx;
            }
            return idx;
        },

        updateEveryItemsEffect(callback) {
            this.schemeContainer.getSelectedItems().forEach(item => {
                if (!Array.isArray(item.effects)) {
                    return;
                }

                const idx = this.findItemEffectIndexByIdOrEffect(item, this.editEffectModal.itemEffectId, this.editEffectModal.effectId);
                if (idx < 0) {
                    return;
                }

                this.schemeContainer.updateItem(item.id, 'effects', item => {
                    callback(item, idx);
                });
            });
        },

        effectModalClosed() {
            if (this.editEffectModal.isAdding) {
                this.updateEveryItemsEffect((item, effectIdx) => {
                    item.effects.splice(effectIdx, 1);
                });
            }
            this.editEffectModal.shown = false;
        },

        onEffectArgChanged(argName, value) {
            this.updateEveryItemsEffect((item, effectIdx) => {
                item.effects[effectIdx].args[argName] = value;
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
            });

            if (!this.editEffectModal.isAdding) {
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects`);
            }
        },

        onEffectCascadeChanged(cascade) {
            this.updateEveryItemsEffect((item, effectIdx) => {
                item.effects[effectIdx].cascade = cascade;
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
            });

            if (!this.editEffectModal.isAdding) {
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects.cascade`);
            }
        },

        onEffectNameChanged(name) {
            this.updateEveryItemsEffect((item, effectIdx) => {
                item.effects[effectIdx].name = name;
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
            });

            if (!this.editEffectModal.isAdding) {
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects.name`);
            }
        },

        onEffectSubmited(effect) {
            this.editEffectModal.shown = false;
            this.updateEveryItemsEffect((item, effectIdx) => {
                item.effects[effectIdx] = effect;
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
            });

            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects`);
        },

        openEditEffectModal(idx) {
            this.editEffectModal.itemEffectId = this.item.effects[idx].id;
            this.editEffectModal.effectId = this.item.effects[idx].effect;
            this.editEffectModal.name = this.item.effects[idx].name;
            this.editEffectModal.cascade = this.item.effects[idx].cascade;
            this.editEffectModal.isAdding = false;
            this.editEffectModal.shown = true;
            this.editEffectModal.effectArgs = this.item.effects[idx].args;
        },

        deleteEffect(idx) {
            const effect = this.item.effects[idx];

            this.schemeContainer.getSelectedItems().forEach(item => {
                const idx = this.findItemEffectIndexByIdOrEffect(item, effect.id, effect.effect);
                if (idx < 0) {
                    return;
                }
                this.deleteAllReferencesToEffect(item.id, item.effects[idx].id);
                item.effects.splice(idx, 1);
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects`);
        },

        onEffectIdChanged(newEffectId) {
            const effect = findEffect(newEffectId);
            const effectArgs = generateEffectArgs(effect);
            const name = this.ensureUniqueEffectName(effect.name);

            this.updateEveryItemsEffect((item, effectIdx) => {
                item.effects[effectIdx].effect = newEffectId;
                item.effects[effectIdx].name = name;
                item.effects[effectIdx].args = effectArgs;
                this.deleteAllReferencesToEffect(item.id, item.effects[effectIdx].id);
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
            });

            this.editEffectModal.name = name;
            this.editEffectModal.effectId = newEffectId;
            this.editEffectModal.effectArgs = effectArgs;

            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects`);
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

        copyAllEffects() {
            const effects = (this.item.effects || []).map(effect => {
                return {
                    ...effect,
                    id: null,
                };
            })
            copyObjectToClipboard('effects', effects).then(() => {
                StoreUtils.addInfoSystemMessage(this.$store, 'Copied all effects');
            });
        },

        pasteCopiedEffects() {
            getObjectFromClipboard('effects').then(effects => {
                if (!Array.isArray(effects)) {
                    return;
                }

                const finalEffects = effects.map(effect => {
                    return {
                        ...effect,
                        id: shortid.generate(),
                    };
                });

                this.schemeContainer.getSelectedItems().forEach(item => {
                    if (!Array.isArray(item.effects)) {
                        item.effects = [];
                    }
                    item.effects = item.effects.concat(utils.clone(finalEffects));
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'effects');
                });

                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects`);
            });
        },
    },

    filters: {
        prettyEffectName(name) {
            if (!name) {
                return 'Unnamed Effect';
            }
            return name;
        }
    }
}
</script>