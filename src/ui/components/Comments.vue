<template>
    <div class="comments-container">
        <h3>Comments</h3>

        <div :class="{'comments-loading': isLoading}">
            <div v-for="(message, messageIdx) in messages">
                <div v-if="message.kind === 'placeholder'" class="comment-more-placeholder">
                    <div class="comment-ellipsis"><i class="fas fa-ellipsis-h"></i></div>

                    <div v-if="message.isLoading">
                        <i class="fas fa-spinner fa-spin fa-1x"></i>
                        <span>Loading...</span>
                    </div>
                    <div v-else-if="message.failedLoading">
                        <span class="hint hint-small">Sorry, something went wrong</span>
                        <div class="hint hint-small">
                            <span class="link" @click="loadMoreComments(messageIdx)">Try again</span>
                        </div>
                    </div>
                    <div v-else>
                        <span class="hint hint-small">There are more comments that were not loaded</span>
                        <div class="hint hint-small">
                            <span class="link" @click="loadMoreComments(messageIdx)">Load more comments</span>
                        </div>
                    </div>

                    <div class="comment-ellipsis"><i class="fas fa-ellipsis-h"></i></div>
                </div>
                <div v-else class="comment-container" :class="{'comment-deleting': message.isDeleting}">
                    <div class="comment-header">
                        <a v-if="message.user" :href="message.user.link" class="comment-user-name">{{message.user.name}}</a>
                        <span class="timestamp" :title="message.formatedTime">{{message.time | formatTimeAgo }}</span>
                        <MenuDropdown v-if="comments.isAdmin || message.own"
                            iconClass="fas fa-ellipsis-v"
                            :options="commentOptions"
                            @delete-comment="deleteComment(messageIdx)"
                            />
                    </div>
                    <div class="comment-body"><pre>{{message.text}}</pre></div>
                </div>
            </div>

            <div v-if="comments.allowed">
                <textarea v-model="newMessage" class="textfield"></textarea>
                <span :class="{disabled: isTextEmpty}" class="btn btn-primary" @click="leaveComment">Leave Comment</span>
            </div>
        </div>

        <div v-if="isLoading" class="loading-splash">
            <i class="fas fa-spinner fa-spin fa-1x"></i>
            <span>Loading...</span>
        </div>
    </div>
</template>

<script>
import forEach from 'lodash/forEach';
import MenuDropdown from './MenuDropdown.vue';
import StoreUtils from '../store/StoreUtils';

const timeAgoUnits = [{
    label: 'y',
    value: 365*24*3600
}, {
    label: 'm',
    value: 31*24*3600
}, {
    label: 'w',
    value: 7*24*3600
}, {
    label: 'd',
    value: 24*3600
}, {
    label: 'h',
    value: 3600
}, {
    label: 'm',
    value: 60
}, {
    label: 's',
    value: 1
}];

function timeAgo(seconds, maxUnits) {
    let str = '';
    let numAdded = 0;
    let leftover = seconds;
    for (let i = 0; i < timeAgoUnits.length && numAdded < maxUnits; i++) {
        const unit = timeAgoUnits[i];
        const n = Math.floor(leftover / unit.value);
        if (n > 0) {
            if (numAdded > 0) {
                str += ' ';
            }
            str += n + unit.label
            leftover = leftover - n * unit.value;
            numAdded++;
        }
    }
    return str + ' ago';
}

function enrichComment(comment) {
    if (comment.kind === 'placeholder') {
        comment.isLoading = false;
        comment.failedLoading = false;
        comment.isDeleting = false;
    }
    comment.formatedTime = new Date(comment.time).toLocaleString();
}

export default {
    props: {
        entityId : {type: String},
        comments : {type: Object, default: {
            enabled: false,
            allowed: false,
            isAdmin: false,
            counter: 0,
            provider: null
        }}
    },

    components: {MenuDropdown},

    beforeMount() {
        if (this.comments.provider) {
            this.comments.provider.getComments(null).then(commentsResult => {
                forEach(commentsResult.comments, enrichComment);
                this.messages = commentsResult.comments;
                this.isLoading = false;
            }).catch(err => {
                console.error(err);
                this.isLoading = false;
            });
        } else {
            this.isLoading = false;
        }
    },

    data() {
        return {
            messages: [],
            newMessage: '',
            isLoading: true,
            commentOptions: [{
                name: 'Delete this comment',
                iconClass: 'fas fa-trash-alt',
                event: 'delete-comment'
            }]
        }
    },

    methods: {
        leaveComment() {
            if (this.newMessage.length === 0) {
                return;
            }

            this.isLoading = true;
            this.comments.provider.leaveComment(this.newMessage).then(message => {
                this.isLoading = false;
                this.messages.push(message);
                this.newMessage = '';
            }).catch(err => {
                console.error(err);
                this.isLoading = false;
            });
        },
        loadMoreComments(placeholderIdx) {
            this.messages[placeholderIdx].failedLoading = false;
            this.messages[placeholderIdx].isLoading = true;
            this.$forceUpdate();

            this.comments.provider.getComments(this.messages[placeholderIdx].timeRange).then(commentsResult => {
                forEach(commentsResult.comments, enrichComment);
                
                this.messages.splice(placeholderIdx, 1);
                const firstPart = this.messages.slice(0, placeholderIdx);
                const secondPart = this.messages.slice(placeholderIdx);

                this.messages = firstPart.concat(commentsResult.comments).concat(secondPart);
                this.$forceUpdate();
            }).catch(err => {
                console.error(err);
                this.messages[placeholderIdx].failedLoading = true;
                this.$forceUpdate();
            });
        },

        deleteComment(idx) {
            const message = this.messages[idx];
            if (message.id) {
                this.messages[idx].isDeleting = true;
                this.comments.provider.deleteComment(message.id).then(() => {
                    this.messages.splice(idx, 1);
                }).catch(err => {
                    console.error(err);
                    this.messages[idx].isDeleting = false;
                    StoreUtils.addErrorSystemMessage(this.$store, 'Was not able to delete comment')
                });
            }
        }
    },

    computed: {
        isTextEmpty() {
            return this.newMessage.length === 0;
        }
    },

    filters: {
        formatTimeAgo(time) {
            const d = new Date(time);
            const now = new Date();
            const secondsAgo = Math.floor((now.getTime() - d.getTime()) / 1000);
            return timeAgo(secondsAgo, 1);
        },
    }
}
</script>