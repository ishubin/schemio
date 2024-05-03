<template>
    <div class="template-properties">
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

            <div v-for="panel in editorPanels" class="template-editor-panel">
                <h4>{{ panel.name }}</h4>
                <ul class="template-editor-panel-items-container">
                    <li v-for="item in panel.items" @click="onEditPanelItemClicked(panel, item)">
                        <svg width="100px" height="70px">
                            <g transform="translate(4, 4)">
                                <ItemSvg :editorId="editorId" :item="item" mode="edit"/>
                            </g>
                            <rect x="0" y="0" width="100" height="70" fill="rgba(0,0,0,0.0)" stroke="none"/>
                        </svg>
                    </li>
                </ul>
            </div>
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
import ItemSvg from '../items/ItemSvg.vue';

export default {
    props: {
        item: {type: Object},
        templateRef: {type: String},
        schemeContainer: {type: Object},
        editorId: {type: String},
    },

    components: { ArgumentsEditor, ArgumentsEditor, ItemSvg },

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
        onEditPanelItemClicked(panel, panelItem) {
            const templateData = panel.click(panelItem);

            if (this.template.args) {
                for (let key in this.template.args) {
                    if (this.template.args.hasOwnProperty(key)) {
                        this.item.args.templateArgs[key] = templateData[key];
                    }
                }
            }
            this.$emit('template-rebuild-requested', this.item.id, this.template, this.item.args.templateArgs);
        },

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
                    this.template = compileItemTemplate(this.editorId, template, this.templateRef);
                    if (template.args) {
                        forEach(template.args, (arg, argName) => {
                            if (!this.args.hasOwnProperty(argName)) {
                                this.args[argName] = arg.value;
                            }
                        });
                    }

                    const selectedTemplateItemIds = [];
                    forEach(this.schemeContainer.selectedItems, item => {
                        if (item.meta.templateRootId === this.item.id) {
                            selectedTemplateItemIds.push(item.args.templatedId);
                        }
                    });
                    const editor = this.template.buildEditor(this.item, this.args, this.item.area.w, this.item.area.h, selectedTemplateItemIds);
                    this.editorPanels = editor.panels;
                }).catch(err => {
                    this.isLoading = false;
                    console.error(err);
                    if (err.response && err.response.status === 404) {
                        this.templateNotFound = true;
                    } else {
                        this.errorMessage = 'Something went wrong, could not load template';
                    }
                });
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