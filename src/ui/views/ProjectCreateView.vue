<template>
    <div>
        <header-component/>
        <div class="middle-content">
            <h4>Name:</h4>
            <input class="textfield" :class="{'missing-field-error' : mandatoryFields.name.highlight}" type="text" v-model="name"/>
            <div class="msg msg-error" v-if="mandatoryFields.name.errorMessage">{{mandatoryFields.name.errorMessage}}</div>

            <h4>Description:</h4>
            <textarea class="textfield" name="description" id="project-description" cols="30" rows="10" v-model="description"></textarea>

            <h4>Access:</h4>
            <ul class="button-group">
                <li>
                    <span @click="isPublic = true" class="toggle-button" :class="{'toggled': isPublic}"><i class="fas fa-check"></i> Public</span>
                </li>
                <li>
                    <span @click="isPublic = false" class="toggle-button" :class="{'toggled': !isPublic}"><i class="fas fa-check"></i> Private</span>
                </li>
            </ul>

            <span class="btn btn-primary" @click="submitProject()">Create Project</span>

            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
        </div>
    </div>
</template>
<script>
import HeaderComponent from '../components/Header.vue';
import apiClient from '../apiClient.js';

export default {
    components: {HeaderComponent},

    data() {
       return {
            name: '',
            description: '',
            isPublic: true,

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
        submitProject() {
            const name = this.name.trim();
            if (name) {
                apiClient.createProject({ 
                    name,
                    description: this.description, 
                    isPublic: this.isPublic
                }).then(project => {
                    window.location = `/projects/${project.id}`;
                }).catch(err => {
                    console.log('ERERR', err.response);
                    if (err.error) {
                        this.errorMessage = err.error;
                    } else {
                        this.errorMessage = 'Not able to create a project';
                    }
                });
            } else {
                this.mandatoryFields.name.highlight = true;
                this.mandatoryFields.name.errorMessage = 'Name should not be empty';
            }
        }
    }
}
</script>

