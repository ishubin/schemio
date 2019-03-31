TODO
-------------
- XS. Overflow item styling: non-active visibility, border, opacity,
- S. User art. Quick search
- M. Improve css. Make editor look nicer.
- M. Search by items text (name and description)
- M. Improve "connecting" state - draw a virtual connector and allow to create routes before connecting to destination item.
- M. Snapping to items
- M. Scheme Thumbnail and preview. (for now use canvas to generate image).
- XS. Fix. Style updates are not rendered for connectors
- XS. Fix. Stroke changes are not updated in component
- XS. Image upload error message (New Scheme Popup, etc.)
- XS. Keep state (expanded/collapsed) of panels in local storage
- S. Styling. Font-size.
- S. Add link item
- L. Undo/Redo with Ctrl-Z/Ctrl-Y
- L. Optimize storage of schemes (json) by removing default styles and property values
- S. Convert items into other types
- L. Smart drawing
- L. S3 storage: AWS, Swift etc.
- M. More component shapes
- XL. Diff-based saving and conflicts resolving
- XL. Export scheme as image.


Grouping
-------------------
 Behavior:

* Every time user clicks `Group items` button - it will generate a unique group id and will assign to all selected elements.
* When selecting any item - it will always select all elements from the group and will not allow to deselect if elements are from the same group
* What if we group two existing groups? - since all elements will be automatically selected, it will create new group id and will overwrite all existing ones
* `Ungroup` button - will remove the `group` field from all items
* `Ungroup this item` button (in the side panel) - will remove `group` field only for the selected item and will deselect all other items.

```javascript

items: [{
    id: 'aaaa1',
    name: 'large element',
    //....
    group: 'group1' // each item may belong to one group
}, {
    id: 'aaaa2',
    name: 'small element 1',
    // ...
    group: 'group1'
}]
```

Patch editing (diff based)
--------------

```json
{
  "id": "Uk55prrKX",
  "name": "some name",
  "description": "Some description",
  "tags": ["backend", "java"],
  "modifiedDate": 1548360532261,
  "items": [{
      "type": "image",
      "area": { "x": 7, "y": -76, "w": 1226, "h": 1000 },
      "style": { },
      "url": "http://example.com/some-image-1",
      "name": "background-image",
      "description": "",
      "id": "RdtvnHWZu",
      "tags": ["background", "image"],
      "locked": true
  }]
}
```

Example of a patch: changed scheme description, item name and added item tag
Version 1:
```javascript
{
    "version": 12344,
    "$fields": [{
        "$path": ["description"],
        "$value": "updated description",
    },{
        "$path": ["items", "#RdtvnHWZu", "name"],
        "$value": "updated name"
    }, {
        "$path": ["items", "#RdtvnHWZu", "tags"],
        "$removed": ["image"],
        "$added": ["scheme"]
    }]
}
```

Version 2:
```javascript
{
    "version": 12344,
    "$fields": {
        "description": "updated description",
        "items": [{
            "$#": "id:#RdtvnHWZu",
            "$fields": {
                "name": "updated name",
                "tags": [{
                    "$removed": "image",
                    "$added": ["scheme"]
                }]
            }
        }]
    }
}
```

Version 2: adding and removing items
```javascript
{
    "version": 12324,
    "$fields": {
        "items": [{
            "$#": "id:#ewr324",
            "$removed": true
        },{
            "$added": {
                "id": "#ertwetwet3",
                //... here go all the fields of an item
            }
        }]
    }
}
```

Version 2: reshuffling items (e.g. swapping positions of two items)
```javascript
{
    "version": 21313,
    "$fields": {
        "items": [{
            "$#": "id:#RdtvnHWZu",
            "$index": 2
        },{
            "$#": "id:#qrqr21",
            "$index": 1
        }]
    }
}
```


Version 2: reshuffling simple arrays (tags). (e.g. original: ["a", "b", "c"], updated: ["b", "a", "c"])
```javascript
{
    "version": 12313,
    "$fields": {
        "tags": [{
            "$#": "val:b",
            "$index": 0
        }, {
            "$#": "val:a",
            "$index": 1
        }, {
            "$#": "val:c",
            "$index": 2
        }]
    }
}
```

Or perhaps it is better not to allow reshuffling and instead just update the entire array:
```javascript
{
    "version": 12313,
    "$fields": {
        "tags": ["b", "a", "c"]
    }
}
```










```html
<template lang="html">
    <div>
        <panel name="General">
            <ul class="button-group">
                <li>
                    <span class="toggle-button" @click="toggleItemLock()"
                        :class="{'toggled': item.locked}"
                        >
                        <i class="fas" :class="[item.locked ? 'fa-lock' : 'fa-unlock']"></i>
                    </span>
                </li>
                <li v-if="item.group">
                    <span class="toggle-button" @click="ungroupItem()">
                        <i class="fas fa-object-ungroup"></i>
                    </span>
                </li>
            </ul>
            <div  v-if="item.type !== 'comment'">
                <h5>Name</h5>
                <input class="textfield" type="text" v-model="item.name"/>
            </div>

            <div v-if="item.type === 'overlay' || item.type === 'component' || item.type === 'shape'">
                <h5>Tags</h5>
                <vue-tags-input v-model="itemTag"
                    :tags="itemTags"
                    :autocomplete-items="filteredItemTags"
                    @tags-changed="onItemTagChange"
                    ></vue-tags-input>
            </div>

            <h5 class="section">Description</h5>
            <div class="textarea-wrapper">
                <textarea v-model="item.description"></textarea>
                <span class="textarea-enlarge" @click="showDescriptionInPopup = true"><i class="fas fa-expand"></i></span>

                <markdown-editor-popup v-if="showDescriptionInPopup"
                    :text="item.description"
                    @close="showDescriptionInPopup = false"
                    @changed="item.description = arguments[0]"
                    />
            </div>
        </panel>

        <panel name="Image" v-if="item.type === 'image'">
            <h5>Image URL</h5>

            <table width="100%">
                <tbody>
                    <tr>
                        <td>
                            <input class="textfield" type="text" v-model="item.url"/>
                        </td>
                        <td width="34px">
                            <div class="file-upload-button">
                                <i class="fas fa-file-upload icon"></i>
                                <input type="file" @change="uploadImage"/>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </panel>

        <panel name="Links" v-if="item.type === 'overlay' || item.type === 'component' || item.type === 'shape' ">
            <div v-if="!item.links || item.links.length === 0">There are no links</div>
            <ul class="links">
                <li v-for="(link, linkId) in item.links">
                    <a class="link" :href="link.url" target="_blank">
                       <i class="fas" :class="getLinkCssClass(link)"></i>
                        {{link.title}}
                    </a>
                    <span class="link edit-link" @click="editLink(linkId, link)"><i class="fas fa-pen-square"></i></span>
                    <span class="link delete-link" @click="deleteLink(linkId)"><i class="fas fa-times"></i></span>
                </li>
            </ul>
            <span class="btn btn-secondary" v-on:click="addLink()"><i class="fas fa-link"></i> Add</span>
        </panel>

        <panel name="Connections" v-if="item.type === 'overlay' || item.type === 'component' || item.type === 'shape' || item.type === 'comment'">
            <span class="btn btn-secondary" v-on:click="connectItem()"><i class="fas fa-sitemap"></i> Connect</span>
        </panel>

        <panel name="Properties" v-if="item.type === 'component'">
            <textarea v-model="item.properties"></textarea>
        </panel>

        <panel name="Image" v-if="item.type === 'component'">
            <span class="btn btn-secondary" v-on:click="showComponentImageModal = true"><i class="fas fa-image"></i> Set Image</span>
            <span class="btn btn-secondary" v-on:click="removeComponentImage()" v-if="item.image && item.image.url"><i class="fas fa-times"></i> Clear Image</span>

            <img v-if="item.image && item.image.url" :src="item.image.url" @click="showComponentImageModal = true" style="max-width:200px; max-height:200px;"/>

            <create-image-modal v-if="showComponentImageModal"
                @submit-image="setComponentImage"
                @close="showComponentImageModal = false"
                ></create-image-modal>
        </panel>

        <panel name="Style" v-if="item.type !== 'image'">
            <div class="property-row" v-if="item.type === 'component'">
                <span class="property-label">Shape: </span>
                <select v-model="item.style.shape">
                    <option v-for="componentShape in knownComponentShapes">{{componentShape}}</option>
                </select>
            </div>

            <div class="property-row" v-if="item.style.background && item.style.background.color">
                <color-picker :color="item.style.background.color" @input="item.style.background.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Background</span>
            </div>
            <div class="property-row" v-if="item.style.text && item.style.text.color">
                <color-picker :color="item.style.text.color" @input="item.style.text.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Text color</span>
            </div>
            <div class="property-row" v-if="item.style.stroke && item.style.stroke.color">
                <color-picker :color="item.style.stroke.color" @input="item.style.stroke.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Stroke color</span>
            </div>

            <div v-if="item.type === 'component'">
                <div class="property-row">
                    <color-picker :color="item.style.properties.background.color" @input="item.style.properties.background.color = arguments[0]; redrawItem();"></color-picker>
                    <span class="property-label">Properties background</span>
                </div>
                <div class="property-row">
                    <color-picker :color="item.style.properties.text.color" @input="item.style.properties.text.color = arguments[0]; redrawItem();"></color-picker>
                    <span class="property-label">Properties text</span>
                </div>

                <div class="property-row">
                    <span class="property-label">Stroke size: </span>
                    <input type="text" v-model="item.style.stroke.size"/>
                </div>
            </div>
        </panel>

        <link-edit-popup v-if="editLinkData"
            :edit="editLinkData.edit" :title="editLinkData.title" :url="editLinkData.url" :type="editLinkData.type"
            @submit-link="onLinkSubmit"
            @close="editLinkData = null"/>

    </div>
</template>

<script>
import LinkEditPopup from '../LinkEditPopup.vue';
import EventBus from '../EventBus.js';
import ColorPicker from '../ColorPicker.vue';
import VueTagsInput from '@johmun/vue-tags-input';
import Panel from '../Panel.vue';
import apiClient from '../../../apiClient.js';
import MarkdownEditorPopup from '../../MarkdownEditorPopup.vue';
import CreateImageModal from '../CreateImageModal.vue';
import linkTypes from '../LinkTypes.js';
import _ from 'lodash';


export default {
    props: ['item'],
    components: {LinkEditPopup, ColorPicker, VueTagsInput, Panel, MarkdownEditorPopup, CreateImageModal},
    mounted() {
        apiClient.getTags().then(tags => {
            this.existingItemTags = _.map(tags, tag => {
                return {text: tag};
            });
        });
    },
    data() {
        return {
            toggleBackgroundColor: false,
            editLinkData: null,
            itemTag: '',
            knownComponentShapes: ['component', 'ellipse'],
            showDescriptionInPopup: false,
            showComponentImageModal: false,
            existingItemTags: [{text: 'Load Balancer'}, {text: 'Java'}, {text: 'Scalatra'}],
        };
    },
    methods: {
        getLinkCssClass(link) {
            return linkTypes.findTypeByNameOrDefault(link.type).cssClass;
        },
        addLink() {
            this.editLinkData = {
                linkId: -1,
                edit: false,
                title: '',
                url: '',
                type: ''
            };
        },
        deleteLink(linkId) {
            this.item.links.splice(linkId, 1);
        },
        editLink(linkId, link) {
            this.editLinkData = {
                linkId: linkId,
                edit: true,
                title: link.title,
                url: link.url,
                type: link.type
            };
        },
        onLinkSubmit(link) {
            if (this.editLinkData.linkId >= 0) {
                this.item.links[this.editLinkData.linkId].title = link.title;
                this.item.links[this.editLinkData.linkId].url = link.url;
                this.item.links[this.editLinkData.linkId].type = link.type;
            } else {
                if (!this.item.links) {
                    this.item.links = [];
                }
                this.item.links.push({
                    title: link.title,
                    url: link.url,
                    type: link.type
                });
            }
        },
        onItemTagChange(newTags) {
            this.item.tags = _.map(newTags, tag => tag.text);
        },
        setComponentImage(imageUrl) {
            if (!this.item.image) {
                this.item.image = {};
            }
            this.item.image.url = imageUrl;
        },
        removeComponentImage() {
            this.item.image = null;
        },
        toggleItemLock() {
            if (this.item.locked) {
                this.item.locked = false;
            } else {
                this.item.locked = true;
            }
            this.$forceUpdate();
        },

        ungroupItem() {
            this.$emit('ungroup-item');
        },

        connectItem() {
            EventBus.$emit(EventBus.START_CONNECTING_ITEM, this.item);
        },

        uploadImage(event) {
            var file = event.target.files[0];
            if (file) {
                var form = new FormData();
                form.append('image', file, file.name);
                axios.post('/images', form).then(response => {
                    if (this.item) {
                        this.item.url = response.data.path;
                    }
                });
            }
        },

        redrawItem() {
            EventBus.emitRedrawItem(this.item.id);
        }
    },
    computed: {
        filteredItemTags() {
            return this.existingItemTags.filter(i => new RegExp(this.itemTag, 'i').test(i.text));
        },
        itemTags() {
            return _.map(this.item.tags, tag => {return {text: tag}});
        }
    },
    watch: {
       item: {
           handler: function(newValue) {
               EventBus.$emit(EventBus.ITEM_CHANGED, newValue);
               this.$forceUpdate();
               EventBus.$emit(EventBus.REDRAW);  //TODO move redrawing to SvgEditor
           },
           deep: true
       }
   }
}
</script>

<style lang="css">
</style>
```
