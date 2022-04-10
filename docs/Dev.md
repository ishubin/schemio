
Patching Schemio documents
-----------------------------

This is a draft of the first implementation of the Schemio patching scheme.

```js
const patch = {
    version: '1', // version of the implemented protocol
    protocol: 'schemio/patch', // a protocol type, for now it is going to be a single one

    parts: {
        // doc field contains modifications of the fields inside the document that are not part of items
        doc: [ {
            path: ['name'],
            replace: 'changed name'
        } ],

        items: {
            changes: [{
                id: 'qweqweq',
                fields: [{
                    path: ['shapeProps', 'color'],
                    replace: 'rgba(0,0,0,0)' // using word "replace" as in the future we might want to implement patching on the fields level
                }],

                order: 12, // shows at which place within its parent it should be placed
                parentId: 'qwewqe' // if specified it means that it needs to be remounted
            } ],

            additions: [{
                id: 'cvxv',
                item: {},
                order: 11,
                parentId: null // means that this item should be added to root
            }],

            deletions: ['wewrqwr', 'sdfsf'] // id of items that should be deleted
        }
    }

};
```
