<template>
    <div>
        <i v-if="isLoading" class="fas fa-spinner fa-spin fa-1x"></i>
        <div v-if="errorMessage" class="msg msg-error">{{ errorMessage }}</div>
        <div v-if="templateNotFound" class="msg msg-error">Template for this item could not be found</div>


        <div v-if="template">
            <h4>{{ template.name }}</h4>
            <p class="hint hint-small" v-if="template.description">{{ template.description }}</p>

            <ArgumentsEditor v-if="template.args"
                :key="`item-${item.id}-template-args-${reloadKey}`"
                :editorId="editorId"
                :schemeContainer="schemeContainer"
                :argsDefinition="template.args"
                :args="args"
                @argument-changed="onArgChanged"
            />
        </div>
        <span class="btn btn-danger"
            @click="breakTemplate"
            title="After the template is broken the items will not be regenerated"
            >Break template</span>
    </div>
</template>

<script>
import ArgumentsEditor from '../ArgumentsEditor.vue';
import {forEach} from '../../../collections';
import {compileItemTemplate} from '../items/ItemTemplate';
import EditorEventBus from '../EditorEventBus';

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
        EditorEventBus.item.templateArgsUpdated.specific.$on(this.editorId, this.item.id, this.onTemplateArgsChangedOutside);
    },

    beforeDestroy() {
        EditorEventBus.item.templateArgsUpdated.specific.$off(this.editorId, this.item.id, this.onTemplateArgsChangedOutside);
    },

    data() {
        return {
            isLoading: false,
            reloadKey: 0,
            errorMessage: null,
            templateNotFound: false,
            template: null,
            editorPanels: [],
            args: this.item.args && this.item.args.templateArgs ? this.item.args.templateArgs : {}
        }
    },

    methods: {
        onTemplateArgsChangedOutside() {
            if (this.item.args && this.item.args.templateArgs) {
                this.args = this.item.args.templateArgs;
                this.reloadKey++;
            }
        },

        loadTemplate() {
            this.templateNotFound = false;
            this.isLoading = true;
            if (this.$store.state.apiClient && this.$store.state.apiClient.getTemplate) {
                this.$store.state.apiClient.getTemplate(this.templateRef).then(template => {
                    this.isLoading = false;
                    this.template = compileItemTemplate(template, this.templateRef);
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
            this.$emit('updated', this.item.id, this.template, this.args);
            this.$forceUpdate();
        },

        breakTemplate() {
            this.$emit('break-template', this.item);
        }
    },

    computed: {
        apiClient() {
            return this.$store.getters.apiClient;
        }
    }
}

</script>