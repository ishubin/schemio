<template>
    <div>
        <table v-if="customArgs.length > 0" class="function-arguments">
            <thead>
                <tr>
                    <th></th>
                    <th width="45%">Name</th>
                    <th width="180px">Type</th>
                    <th>Default value</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(arg, argIdx) in customArgs">
                    <td><span class="link icon-delete" @click="deleteFuncArgument(argIdx)"><i class="fas fa-times"></i></span></td>
                    <td>
                        <input class="textfield"
                            type="text"
                            :class="{'field-error': arg.isError}"
                            v-model="arg.name"
                            @input="onFunctionArgNameChange(argIdx, $event.target.value)"
                            />
                    </td>
                    <td>
                        <select class="dropdown" v-model="arg.type" @change="onArgTypeChanged(argIdx, $event)">
                            <option v-for="opt in supportedArgumentTypes" :value="opt.value">{{ opt.name }}</option>
                        </select>
                    </td>
                    <td>
                        <div class="function-argument-value">
                            <PropertyInput
                                :key="`arg-property-input-${argIdx}-${arg.type}`"
                                :editorId="editorId"
                                :schemeContainer="schemeContainer"
                                :descriptor="arg.descriptor"
                                :value="arg.value"
                                @changed="onArgDefaultValueChange(argIdx, $event)"
                                />
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div v-else class="hint hint-small">
            This function does not have arguments
        </div>
        <span class="btn btn-secondary" @click="addArgument"><i class="fa-solid fa-gear"></i> Add argument</span>
    </div>
</template>

<script>
import shortid from 'shortid';
import StoreUtils from '../../store/StoreUtils';
import PropertyInput from './properties/PropertyInput.vue';

const defaultTypeValues = {
    'string': '',
    'number': 0,
    'color': 'rgba(255,255,255,1.0)',
    'advanced-color': {type: 'solid', color: 'rgba(255,255,255,1.0)'},
    'image': '',
    'boolean': true,
    'stroke-pattern': 'solid',
    'element': '',
    'scheme-ref': '',
};

const _argNameRegex = new RegExp('^[a-zA-Z_][a-zA-Z0-9_]*$');


export default {
    props: ['editorId', 'args', 'schemeContainer'],
    components: {PropertyInput},

    data() {
        return {
            customArgs: this.args.map(arg => {
                return {
                    ...arg,
                    descriptor: {type: arg.type},
                };
            }),

            supportedArgumentTypes: [
                {name: 'string', value: 'string'},
                {name: 'number', value: 'number'},
                {name: 'color', value: 'color'},
                {name: 'fill', value: 'advanced-color'},
                {name: 'image', value: 'image'},
                {name: 'checkbox', value: 'boolean'},
                {name: 'stroke pattern', value: 'stroke-pattern'},
                {name: 'item', value: 'element'},
                {name: 'diagram', value: 'scheme-ref'},
            ],

        };
    },

    methods: {
        onArgTypeChanged(argIdx, event) {
            const argDef = this.customArgs[argIdx];
            const newType = event.target.value;
            argDef.descriptor = {type: newType};
            argDef.value = defaultTypeValues[newType];
            this.$emit('arg-type-changed', argIdx, newType, argDef.value);
        },

        onArgDefaultValueChange(argIdx, value) {
            this.customArgs[argIdx].value = value;
            this.$emit('arg-value-changed', argIdx, value);
        },

        onFunctionArgNameChange(argIdx, name) {
            if (!name || !_argNameRegex.test(name)) {
                StoreUtils.addErrorSystemMessage(this.$store, 'Invalid argument name. It should not contain spaces or special symbols and start with a literal', 'invalid-arg-name');
                this.customArgs[argIdx].isError = true;
            } else {
                this.customArgs[argIdx].isError = false;
                this.$emit('arg-name-changed', argIdx, name);
            }
        },

        addArgument() {
            const idx = this.customArgs.length + 1;
            const argDef = {
                id: shortid.generate(),
                name: `arg${idx}`,
                type: 'string',
                value: '',
            };
            this.customArgs.push({
                ...argDef,
                descriptor: {type: 'string'},
                isError: false,
            });
            this.$emit('arg-added', argDef);
        },

        deleteFuncArgument(argIdx) {
            this.customArgs.splice(argIdx, 1);
            this.$emit('arg-deleted', argIdx);
        }
    }
}
</script>