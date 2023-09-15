
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



Snippets & Templates
--------------------

- All ids in templates will be changed and their references will be updated accordingly
- Should be possible to generate template from selection
- User templates
- Export SVG preview as well
- `$-if`
- `$-else`

```js
const templates = [{
    name: 'Popup',

    args: {
        title: {name: 'Title', value: 'Title placeholder...', type: 'string'},
        content: {name: 'Content', value: 'Content placeholder...', type: 'string'},
        background: {name: 'Background', type: 'advanced-color', value: {type: 'solid', color: 'rgba(168, 193, 219, 1.0)'}}
    },

    items: [{
        id: 'a',
        shape: 'rect',
        textSlots: {
            body: {
                text: {$placeholder: 'content'}
            }
        }
        shapeProps: {
            fill: {$placeholder: 'background'}
        }
    }]
}];
```

```js
actions = [{
    '$-if': {arg: 'animation', op: '=', values: ['rotate']}
    // ....
}, {
    '$-else': {}
    // ...
}, {
    '$-if': {arg: 'animation', op: '=', values: ['rotate', 'simple']}
    // ....

}]

```

```
$-arg:Close Animation:choice:scale-fade,fade,simple
$-arg:Hover Animation:choice:rotate,simple
$-arg:Drop Shadow:boolean:true
$-placeholder:Background:shapeProps.fill
$-placeholder:Stroke:shapeProps.strokeColor
$-if:Drop Shadow:=:true:effects.1
$-if:Close Animation:=:scale-fade,fade:behavior.events.0.actions.0
$-if-else:behavior.events.0.actions.1
$-if:Close Animation:=:scale-fade:behavior.events.0.actions.2


# for cross
$-if:Hover Animation:=:rotate:behavior.events.0.actions.2
```



```js
const template = {
    args: {
        tabs: {type: 'number', min: 1, max: 20, value: 3},
        tabWidth: {type: 'number', min: 1, max: 200, value: 50},
        tabHeight: {type: 'number', min: 1, max: 200, value: 50},
        tabMargin: {type: 'number', min: 0, max: 1000, value: 10},
    },

    item: {
        id: 'container',
        name: 'tab-container',
        childItems: [{
            '$-for': {from: 1, until: {'$-expr': 'tabs + 1'}, it: 'tab'},
            id: {'$-string-expr': 'tab-${tab}'},
            name: {'$-string-expr': 'tab-${tab}'},
            area: {
                x: {'$-expr': 'tab * tabWidth + (tab) * tabMargin'},
                y: 10,
                w: {'$-expr': 'tabWidth'},
                h: {'$-expr': 'tabHeight + 10'},
            },
            behavior: {
                events: [{
                    id: {'$-id': ''}, // generates unique id
                    event: 'clicked',
                    actions: [{
                        on: true,
                        element: 'self',
                        method: "set",
                        args: {
                            field: "opacity",
                            value: 100,
                            animated: false,
                            animationDuration: 0.2,
                            transition: "ease-in-out",
                            inBackground: true
                        }
                    }, {
                        on: true,
                        element: {'$-string-expr': 'tab-container-${tab}'}
                    }]
                }]
            }
        }, {
            '$-for': {start: 1, end: {'$-arg-value': 'tabs'}, it: 'tab'},
            id: 'tab-container-${tab}',
            name: 'tab-container-${tab}'
        }]
    }
}
```