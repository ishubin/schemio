<template>
    <div>
        <div class="hint hint-small">
            Auto-layout lets you define rules by which the positioning of the item should be adjusted, depending on the changes in the document
        </div>

        <div class="auto-layout-rules-container">
            <div class="auto-layout-rule" v-for="(rule, ruleIdx) in rules" v-if="rule.definition">
                <div>
                    <span class="rule-delete" @click="deleteRule(ruleIdx)"><i class="fa-solid fa-xmark"></i></span>
                </div>

                <Dropdown
                    :options="knownRuleTypes"
                    @selected="onRuleTypeChanged(ruleIdx, arguments[0].id)"
                    >
                    {{ rule.t }}
                </Dropdown>

                <ElementPicker
                    v-if="rule.definition.useRef"
                    :editorId="editorId"
                    :schemeContainer="schemeContainer"
                    :excludedItemIds="[item.id]"
                    :element="rule.ref"
                    :useSelf="false"
                    :allowTags="false"
                    :allowNone="true"
                    @selected="onRuleRefChange(ruleIdx, arguments[0])"
                    />

                <NumberTextfield
                    v-if="rule.definition.useValue"
                    :value="rule.v"
                    @changed="onRuleValueChange(ruleIdx, arguments[0])"
                    />
            </div>
        </div>
        <span class="btn btn-secondary" @click="addNewRule">Add rule</span>
    </div>
</template>

<script>
import Dropdown from '../../Dropdown.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import EditorEventBus from '../EditorEventBus';
import ElementPicker from '../ElementPicker.vue';
import {getItemRuleDefinitionById, knownRuleTypes} from '../../../scheme/ItemRules';


export default {
    props: {
        item: { type: Object, required: true },
        editorId: { type: String, required: true },
        schemeContainer: { type: Object, required: true },
    },

    components: { ElementPicker, NumberTextfield, Dropdown },

    data() {
        return {
            knownRuleTypes,
            rules: this.buildRules()
        };
    },
    methods: {
        buildRules() {
            const rules = Array.isArray(this.item.rules) ? this.item.rules : [];
            return rules.map(rule => this.wrapRule(rule));
        },

        wrapRule(rule) {
            return {
                ...rule,
                definition: getItemRuleDefinitionById(rule.t)
            };
        },

        addNewRule() {
            this.item.rules.push({
                t: 'left-of',
                v: 0,
                ref: null,
                edge: null
            });
            this.rules = this.buildRules();
            this.$forceUpdate();
            this.emitUpdate();
        },

        onRuleTypeChanged(ruleIdx, ruleType) {
            this.item.rules[ruleIdx].t = ruleType;
            this.rules[ruleIdx] = this.wrapRule(this.item.rules[ruleIdx]);
            this.$forceUpdate();
            this.emitUpdate();
        },

        deleteRule(ruleIdx) {
            this.item.rules.splice(ruleIdx, 1);
            this.rules = this.buildRules();
            this.$forceUpdate();
            this.emitUpdate();
        },

        onRuleRefChange(ruleIdx, selector) {
            this.item.rules[ruleIdx].ref = selector;
            this.rules[ruleIdx].ref = selector;
            this.$forceUpdate();
            this.emitUpdate();
        },

        onRuleValueChange(ruleIdx, value) {
            this.item.rules[ruleIdx].v = value;
            this.rules[ruleIdx].v = value;
            this.$forceUpdate();
            this.emitUpdate();
        },

        emitUpdate() {
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        }
    },
}
</script>