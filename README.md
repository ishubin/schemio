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



#### Some ideas for redesigning of item behavior using custom language
##### v1
```
describe `item: "Browser"` {
    on "init" {
        `self` -> trigger(event: "Do fancy stuff")
    }
    on "clicked" {
        `item: #rqwtqwt` -> hide(
            animated: true,
            duration: 0.5,
            inBackground: false
        )
    }
    on "Do fancy stuff" {
        `self` -> opacity = 0.1
        `item: #wqqqwe`
    }
}

# Describes all items that were marked with "reset" tag
describe `tag: "reset"` {
    on "init" {
        `self` -> hide()
    }
}
```

##### v2
```
describe('item: "Browser"') {
    init() {
        `self`.triggerEvent(event: 'Do fancy stuff')
    }

    /// or in another form
    on('init') {

    }

    clicked() {
        // ....
    }

    on('some custom event') {
        // ....
    }

    // example of using event arguments
    on('metrics-update') {
        `self`.opacity = $.value * 100
        `self`.fieldTransition(field: 'color', value1: '#000000', value2: '#ff00ff', value: $.value, min: 0, max: 100)
    }
}
```

##### v3
```
describe `~Browser` {
    on 'init' {
        self.triggerEvent(event: 'custom event', args: [value: 23])
    }
    on 'custom event' { 
        self.opacity = event.value * 100
        self.fieldTransition(field: 'color', value1: '#000000', value2: '#ff00ff', value: $.value, min: 0, max: 100)
    }
    on 'click' {
        `~Button`.show(animated: true)
        `#qwqwr`.triggerEvent(event: 'some other event')
    }

    on 'frame' [number: 1] {

    }
    on 'frame' [number: 2] {

    }
}
```

##### v4
```
$("#browser").describe {
    on("init") {
        self.triggerEvent(event: "custom event", args: {value: 23})
    }

    on("custom event") {
        $("@some-group").set("opacity", $args.value)
    }
}
```

##### v5
```
`#browser`.describe {
    on("init") {
        `self`.triggerEvent(event: "custom event", args: {value: 23})
    }

    on("custom event") {
        `group: some-group`.set("opacity", $args.value)
        // or 
        `group: some-group`.opacity = $args.value
    }
}
```

##### v6
```
describe `#Browser` {
    on "init" {
        `self`.trigger(event: "Do fancy stuff")
    }
    on "clicked" {
        `item: #rqwtqwt`.hide(
            animated: true,
            duration: 0.5,
            inBackground: false
        )
    }
    on "Do fancy stuff" {
        `self`.set(name: "opacity", value: "0.1")
        // or 
        `self`.opacity = 0.1
    }
}
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


```

arrow angles: 15, [ 63, -7.6, -81 ]

arrow angles: [ -43, 0.3, 55 ]

arrow angles: [ 23, 1.1, -41 ]

arrow angles (with not straight line): -58, -58, 51, [ -26, 0.3, 55 ]

triangle angles: 16,[ 60, -6, -81, -15]

triangle angles: [-43, 0.3, 60, 79]


arrow pattern features:
    - last 3 points are within small area,
    - last 3 angles sequence should be one of the two:
        -  Big, Small, -Big: (> 15, -15 to 15, < -15 )
        - -Big, Small,  Big ( < -15, -15 to 15, > 15)


triangle pattern features:
    - last 4 points are within small area
    - last 4 angles sequence should be one of the two:
        -  Big, Small, -Big, -Big: (> 15, -15 to 15, < -15, < -15 )
        - -Big, Small,  Big, Big ( < -15, -15 to 15, > 15, > 15)

```




License
---------

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.