Schemio
--------------------

Schemio is a web based service for creating and viewing schemes online. It lets you design any scheme you want, link items to other schemes and provide description for each item. The basic idea behind Schemio is to provide visual and structured documentation so anyone can get a good understanding of a project.




Item selectors:
```js
/****** Current implementation *********/
'item: #abc'            // specifies item with id abc
'self'                  // references itself
'group: reset'          // anything that was tagged with 'reset' tag


/******** another suggestion ***********/
'#abc'                  // matches anything with id abc 
'~Browser'              // by name "Browser"
'self'                  // self
'&reset'                // anything marked as part of 'reset' group

```





Frame Player structure
--------------------------------------------

```javascript
const item = {
    shape: 'frame_player',
    shapeProps: {
        // Functions have "animatable" parameters that can be used in frames
        functions: {
            func_1: {
                element: '#some-item',
                function: 'move_along_path',
                args: {
                    pathElement: '#rwererwr',
                }
            }
        },
        frames: [{
            frame: 0,
            element: '#some-item', // element picker
            property: 'area.x',
            value: 0,
            interpolation: 'linear', // e.g. linear, step, smooth, beizer
        }, {
            frame: 0,
            element: '#some-item', // element picker
            property: 'area.y',
            value: 0,
            interpolation: 'linear', // e.g. linear, step, smooth, beizer
        }, {
            frame: 5,
            element: '#some-item',
            property: 'opacity',
            value: false,
            interpolation: 'step'
        }, 
        // ..............
        {
            frame: 10,
            function: 'func_1',
            property: 'pathPercentage',
            value: 0,
            interpolation: 'step'
        }]
    }
}
```


```javascript
// Ideas for frame player
const framePlayer = {
    shape: 'frame_player',
    shapeProps: {
        animations: [{
            kind: 'item',
            id: 'some-item-id',
            property: 'area.x',
            frames: [{
                frame: 0,
                value: 0,
                kind: 'beizer', // can be 'linear', 'beizer', 'step'
                a: { v: 0, f: -30 },
                b: { v: 5, f: 10 },
            }, {
                frame: 30,
                value: 10,
                kind: 'linear',
            }]
        }, {
            kind: 'item',
            id: 'another-item-id',
            property: 'shapeProps.strokeSize',
            frames: [{
                
            }]
        }, {
            kind: 'path', // moving item along path
            id: 'some-item-id', // id of item that should be moving along path
            property: 'some-path-id', // id of path
            args: {
                rotate: true // adjust item rotation to the path,
                rotationOffset: 80
            }
        }]
    }
};
```

When clicking on frame player in edit mode - it will bring a thin frame `animation panel` on the bottom. The panel should have `Toggle Animation Editor` button.
When user clicks that button - `animation panel` stays constantly on and frame player can now be deselected. When user selects a frame and clicks record in `animation panel` - it goes into `recording mode`. In `recording mode` if user changes any `recognized property` of any item - it will make a record of that in the `selected frame`.

License
---------

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.