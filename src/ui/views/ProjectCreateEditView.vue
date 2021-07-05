<template>
    <div>
        <header-component/>
        <div class="middle-content">
            <h2 v-if="createMode">Create New Project</h2>
            <h2 v-else>Edit Project</h2>

            <div v-if="isLoadingProject" class="mock-container mock-project">
                <span class="mock-element mock-project-name mock-animated"></span>
                <span class="mock-element mock-project-description mock-animated"></span>
            </div>

            <div v-else>
                <h4>Name:</h4>
                <input class="textfield" :class="{'missing-field-error' : mandatoryFields.name.highlight}" type="text" v-model="name"/>
                <div class="msg msg-error" v-if="mandatoryFields.name.errorMessage">{{mandatoryFields.name.errorMessage}}</div>

                <h4>Description:</h4>
                <textarea class="textfield" name="description" id="project-description" cols="30" rows="10" v-model="description"></textarea>

                <h4>Access:</h4>
                <div class="section">
                    <div class="radio-project-permission-option" :class="{selected: isPublic === false}"  @click="isPublic = false">
                        <input type="radio" name="access-permissions" id="radio-private" v-model="isPublic" :value="false"/>
                        <label for="radio-private"> <i class="fas fa-lock"/> <b>Private</b></label>
                        <div class="hint">
                            Your project will only be accessible to you and will not be listed on home page. Other users will not be able to view documents in your project even with direct link.
                        </div>
                    </div>

                    <div class="radio-project-permission-option" :class="{selected: isPublic === true}"  @click="isPublic = true">
                        <input type="radio" name="access-permissions" id="radio-public" v-model="isPublic" :value="true"/>
                        <label for="radio-public"> <i class="fas fa-eye"/> <b>Public</b></label>
                        <div class="hint">
                            Your probject will be visible on the home page and will be accessible to anyone in read-only mode. Other users will be able to view and copy your documents.
                        </div>
                    </div>
                </div>


                <div v-if="createMode" class="section">
                    <span v-if="isCreatingProject" class="btn btn-primary" @click="createProject()"><i class="fas fa-spinner fa-spin"></i> Creating...</span>
                    <span v-else class="btn btn-primary" @click="createProject()">Create Project</span>
                    <a class="btn btn-secondary" href="/">Cancel</a>
                </div>

                <div v-else class="section">
                    <span v-if="isSavingProject" class="btn btn-primary" @click="saveProject()"><i class="fas fa-spinner fa-spin"></i>Saving...</span>
                    <span v-else class="btn btn-primary" @click="saveProject()">Save Changes</span>
                    <a class="btn btn-secondary" :href="`/projects/${projectId}`">Cancel</a>
                </div>

                <div v-if="!createMode" class="section">
                    <h4>Danger zone</h4>
                    <span class="btn btn-danger" @click="onDeleteProjectClicked()">Delete Project</span>
                </div>

            </div>


            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
        </div>
    </div>
</template>
<script>
import HeaderComponent from '../components/Header.vue';
import apiClient from '../apiClient.js';
import StoreUtils from '../store/StoreUtils';

export default {
    components: {HeaderComponent},

    props: {
        createMode: { type: Boolean, default: true }
    },

    beforeMount() {
        if (!this.createMode) {
            this.loadProject();
        }
    },

    data() {
        return {
            projectId: this.$route.params.projectId,
            name: '',
            nameFailed: null,

            description: '',
            isPublic: false,

            isLoadingProject: false,
            isSavingProject: false,
            isCreatingProject: false,

            mandatoryFields: {
                name: {
                    highlight: false,
                    errorMessage: null
                }
            },
            errorMessage: null
        };
    },

    methods: {
        createProject() {
            const name = this.name.trim();
            if (name) {
                this.isCreatingProject = true;
                apiClient.createProject({ 
                    name,
                    description: this.description, 
                    isPublic: this.isPublic
                }).then(project => {
                    this.isCreatingProject = false;
                    window.location = `/projects/${project.id}`;
                }).catch(err => {
                    this.isCreatingProject = false;
                    if (err.data && err.data.error) {
                        this.errorMessage = err.data.error;
                    } else {
                        this.errorMessage = 'Not able to create a project';
                    }
                });
            } else {
                this.mandatoryFields.name.highlight = true;
                this.mandatoryFields.name.errorMessage = 'Name should not be empty';
            }
        },

        saveProject() {
            const name = this.name.trim();
            if (name) {
                this.isSavingProject = true;
                const description = this.description;
                const isPublic = this.isPublic;

                this.errorMessage = null;
                apiClient.patchProject(this.projectId, { name, description, isPublic }).then(() => {
                    this.isSavingProject = false;
                    StoreUtils.addInfoSystemMessage(this.$store, 'Project was saved', 'saved-project');
                }).catch(err => {
                    this.isSavingProject = false;
                    if (err.data && err.data.error) {
                        this.errorMessage = err.data.error;
                    } else {
                        this.errorMessage = 'Failed to update project';
                    }
                });
            } else {
                this.mandatoryFields.name.highlight = true;
                this.mandatoryFields.name.errorMessage = 'Name should not be empty';
            }

        },

        loadProject() {
            this.isLoadingProject = true;
            apiClient.getProject(this.projectId)
            .then(project => {
                this.name = project.name;
                this.mandatoryFields.name.highlight = false;
                this.mandatoryFields.name.errorMessage = null;
                this.description = project.description;
                this.isPublic = project.isPublic;
                this.isLoadingProject = false;
            })
            .catch(err => {
                this.isLoadingProject = false;
                //TODO give different error message depending on response code
                this.errorMessage = 'Failed to load project, please try again';
            })
        },

        onDeleteProjectClicked() {
            if (confirm(`Are you sure you want to delete this project? You will loose all schemes created in this project`)) {
                apiClient.deleteProject(this.projectId)
                .then(() => {
                    window.location = '/';
                }).catch(err => {
                    this.errorMessage = 'Sorry, could not delete project. Something went wrong.';
                });
            }
        },

    }
}
</script>

