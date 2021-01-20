<template>
    <div>
        <header-component/>
        <div class="middle-content">
            <h1 v-if="createMode">Create New Project</h1>
            <h1 v-else>Edit Project</h1>

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
                    <div class="toggle-group">
                        <span v-for="access in [{value: true, icon: 'fas fa-unlock', name: 'Public'}, {value: false, icon: 'fas fa-lock', name: 'Private'}]"
                            class="toggle-button"
                            :class="{toggled: isPublic === access.value}"
                            @click="isPublic = access.value"
                            ><i :class="access.icon"></i> {{access.name}}</span>
                    </div>
                </div>


                <div v-if="createMode" class="section">
                    <span class="btn btn-primary" @click="createProject()">Create Project</span>
                    <a class="btn btn-secondary" href="/">Cancel</a>
                </div>

                <div v-else class="section">
                    <span v-if="isSavingProject" class="btn btn-primary" @click="saveProject()"><i class="fas fa-spinner fa-spin"></i>Saving...</span>
                    <span v-else class="btn btn-primary" @click="saveProject()">Save Changes</span>
                    <span class="btn btn-danger" @click="onDeleteProjectClicked()">Delete Project</span>
                    <a class="btn btn-secondary" :href="`/projects/${projectId}`">Cancel</a>
                </div>

            </div>


            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
        </div>
    </div>
</template>
<script>
import HeaderComponent from '../components/Header.vue';
import apiClient from '../apiClient.js';

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
            isPublic: true,

            isLoadingProject: false,
            isSavingProject: false,

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
                apiClient.createProject({ 
                    name,
                    description: this.description, 
                    isPublic: this.isPublic
                }).then(project => {
                    window.location = `/projects/${project.id}`;
                }).catch(err => {
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

