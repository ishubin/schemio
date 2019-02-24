

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

_TBD_
