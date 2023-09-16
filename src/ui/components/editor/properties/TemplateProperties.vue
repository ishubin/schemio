<template>
    <div>
        <i v-if="isLoading" class="fas fa-spinner fa-spin fa-1x"></i>
        <div v-if="errorMessage" class="msg msg-error">{{ errorMessage }}</div>
        <div v-if="templateNotFound" class="msg msg-error">Template for this item could not be found</div>

        <div v-if="template">
            <p class="hint hint-small" v-if="template.description">{{ template.description }}</p>

            <ArgumentsEditor v-if="template.args"
                :editorId="editorId"
                :schemeContainer="schemeContainer"
                :argsDefinition="template.args"
                :args="args"
                @argument-changed="onArgChanged"
            />
        </div>
        <span v-if="template" class="btn btn-primary btn-wide" :class="{disabled: !modified}" @click="regenerateTemplateItem()">Update</span>
    </div>
</template>

<script>
import ArgumentsEditor from '../ArgumentsEditor.vue';
import { processJSONTemplate } from '../../../templater/templater';
import { traverseItems } from '../../../scheme/Item';
import utils from '../../../utils';
import forEach from 'lodash/forEach';

export default {
    props: {
        item: {type: Object},
        templateRef: {type: String},
        schemeContainer: {type: Object},
        editorId: {type: String},
    },

    components: { ArgumentsEditor, ArgumentsEditor },

    beforeMount() {
        this.loadTemplate();
    },

    data() {
        return {
            isLoading: false,
            errorMessage: null,
            templateNotFound: false,
            template: null,
            modified: false,
            args: this.item.args && this.item.args.templateArgs ? this.item.args.templateArgs : {}
        }
    },

    methods: {
        loadTemplate() {
            this.templateNotFound = false;
            this.isLoading = true;
            if (this.$store.state.apiClient && this.$store.state.apiClient.getTemplate) {
                this.$store.state.apiClient.getTemplate(this.templateRef).then(template => {
                    this.isLoading = false;
                    this.template = template;
                    if (template.args) {
                        forEach(template.args, (arg, argName) => {
                            if (!this.args.hasOwnProperty(argName)) {
                                this.args[argName] = arg.value;
                            }
                        });
                    }
                }).catch(err => {
                    this.isLoading = false;
                    console.error(err);
                    if (err.response.status === 404) {
                        this.templateNotFound = true;
                    } else {
                        this.errorMessage = 'Something went wrong, could not load template';
                    }
                })
            }
        },

        onArgChanged(name, value) {
            this.args[name] = value;
            this.modified = true;
            this.$forceUpdate();
        },

        regenerateTemplateItem() {
            const item = processJSONTemplate(this.template.item, this.args);
            item.args = {templateRef: this.templateRef, templateArgs: utils.clone(this.args)};

            if (item.childItems) {
                traverseItems(item.childItems, childItem => {
                    if (!childItem.args) {
                        childItem.args = {};
                    }
                    childItem.args.templated = true;
                });
            }

            this.$emit('updated', this.item.id, item);
        }
    },

    computed: {
        apiClient() {
            return this.$store.getters.apiClient;
        }
    }
}
</script>