TODO
-------------
- L. Parameterized data. Use Global parameters page for storing links or other data. This should be processed with ${...} expression. e.g. ${global.prod.jenkins.link}
- M. Implement proper mongo migrations
- S. User art. Quick search
- M. Improve css. Make editor look nicer.
- M. Improve "connecting" state - draw a virtual connector and allow to create routes before connecting to destination item.
- M. Snapping to items
- XS. Fix. Style updates are not rendered for connectors
- XS. Fix. Stroke changes are not updated in component
- XS. Image upload error message (New Scheme Popup, etc.)
- XS. Keep state (expanded/collapsed) of panels in local storage
- M. Export scheme as image.
- S. Styling. Font-size.
- S. Add link item
- L. Undo/Redo with Ctrl-Z/Ctrl-Y
- L. Optimize storage of schemes (json) by removing default styles and property values
- S. Convert items into other types
- L. S3 storage: AWS, Swift etc.
- M. More component shapes
- M. Add property types rendering in component items. Specify it via '|' symbol
- XL. Smart drawing
- XL. Diff-based saving and conflicts resolving


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
