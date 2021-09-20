<template>
    <modal title="Change Log" @close="$emit('close')">
        <div class="diff-change-log">
            <div v-for="change in changes" class="diff-change-log-entry" :class="[`diff-change-${change.changeType}`]">
                <span v-if="change.itemId"><i class="fas fa-cube"></i> {{change.name}}</span>
                <ul v-if="change.changeType === 'modification'">
                    <li v-for="mod in change.modifications">
                        <i class="fas fa-cog"></i> {{mod.propertyName}}
                    </li>
                </ul>
            </div>
        </div>
    </modal>
</template>

<script>
import { ChangeType } from '../../scheme/scheme-diff';
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import Modal from '../Modal.vue';
import Shape from './items/shapes/Shape';
import { textSlotProperties } from '../../scheme/Item';

function getPropertyPrettyName(shape, path) {
    if (path.length === 0) {
        return 'Unknown property';
    }

    if (path.length === 1) {
        return path[0].charAt(0).toUpperCase() + path[0].slice(1);;
    } else if (path[0] === 'shapeProps') {
        let argDescriptor = null;
        const argName = path[1];
        if (Shape.standardShapeProps.hasOwnProperty(argName)) {
            argDescriptor = Shape.standardShapeProps[argName];
        } else if (shape.args.hasOwnProperty(argName)) {
            argDescriptor = shape.args[argName];
        }
        if (argDescriptor !== null) {
            return argDescriptor.name;
        }
    } else if (path[0] === 'textSlots' && path.length > 2) {
        const slotName = path[1];
        const slotArg = path[2];

        const fieldDescription = find(textSlotProperties, textSlotProperty => textSlotProperty.field === slotArg);
        if (fieldDescription) {
            return `Text / ${textSlotName} / ${fieldDescription.name}`;
        }
    }
    return path.join('.');
}

function generateModifications(item, modifications) {
    const shape = Shape.find(item.shape);

    const changedProperties = new Set();

    forEach(modifications, mod => {
        if (shape) {
            changedProperties.add(getPropertyPrettyName(shape, mod.path));
        } else {
            changedProperties.add(mod.path.join('.'))
        }
    });

    const mods = [];
    changedProperties.forEach(propertyName => {
        mods.push({ propertyName });
    });

    return mods;
}

export default {
    components: { Modal },

    props: ['changeLog', 'schemeContainer'],

    data() {
        const changes = [];

        forEach(this.changeLog, change => {
            const ch = {
                changeType: 'modification',
                itemId    : change.itemId,
                name      : change.name
            };

            if (change.change === ChangeType.DELETION) {
                ch.changeType = 'deletion';
            } else if (change.change === ChangeType.ADDITION) {
                ch.changeType = 'addition';
            } else {
                ch.changeType = 'modification';

                const item = this.schemeContainer.findItemById(change.itemId);
                if (item) {
                    ch.modifications = generateModifications(item, change.modifications);
                } else {
                    const mods = [];
                    forEach(change.modifications, mod => {
                        mods.push({
                            propertyName: mod.path.join('.')
                        });
                    });

                    ch.modifications = mods;
                }

            }
            changes.push(ch);
        })

        return {
            changes,
        }
    }
}
</script>