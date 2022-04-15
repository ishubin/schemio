
Patching Schemio documents
-----------------------------

This is a draft of the first implementation of the Schemio patching scheme.

```js
const patch = {
    version: '1', // version of the implemented protocol
    protocol: 'schemio/patch', // a protocol type, for now it is going to be a single one

    // doc field contains modifications of the fields inside the document that are not part of items
    doc: [ {
        path: ['name'],
        replace: 'changed name'
    } ],

    // Array of item operations such as:
    //  - add
    //  - delete
    //  - modify - used when the fields of the item have been changed
    //  - remount - used for both remounting and just the sort order change
    items: [{
        id: 'qwe1',
        op: 'delete'
    }, {
        id: 'qwe2',
        op: 'add',
        item: {/* contains item object without childItems */},
        sortOrder: 0,
        parent: 'qwe1' // if set as null then it is added to the root
    }, {
        id: 'qwe3',
        op: 'modify',
        changes: [{
            path: ['shapeProps', 'color'],
            replace: '#fff'
        }]
    }, {
        id: 'qwe4',
        op: 'remount', // remount will also be used even if the parent wasn't changed but only the sort order changed
        parent: 'qwe2',
        sortOrder: 0
    }]
};

```
