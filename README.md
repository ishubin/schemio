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
'&reset'                // anything marked as part of 'reset' grouped

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


// example of structures
x = [
    number: 1,
    age: 35,
    name: 'John'
]

// array
x = [0, 2, 3]

// code block
func = {
    print(w)
}

// code block with arguments
func = function (x, y, z) { 
    print(x + y * z)
}

// if statement
if (x > y) {
    ....
} else {
    ....
}

// for loop
for x, i in [0 to 10] {

}

```


### Fill control

```js
const item = {
    shapeProps: {
        fill:   {type: 'solid',     color: '#fff'},
        fill2:  {type: 'image',     image: '/path/to/image'},
        fill3:  {type: 'gradient',  colors: [['#fff', 0], ['#qwe', 30]],
    }
}
```


### Text rendering


##### Rules:
- [ ] By default text can be defined in 3 slots: above, center, below
- [ ] item component can redefine all slots using `getTextSlots` function
    - [ ] if that function doesn't return anything - it means there is no slot for text, so no way to render text
    - [ ] `getTextSlots` functions is supposed to return array of {name: 'slot-name', area: {x: 0, y: 0, w: 100, h:30}}
    - [ ] Text Panel (GeneralPanel.vue) will render all available slots in tabs
    - [ ] when double-clicking on the text slot or in item - it will try to find the best matching text slot even if point is outside its area
    - [ ] Each slot can be moved into another one, but with the warning that it will replace and erase the other slot text and properties
    - [ ] valign - should only have: top, center and bottom alignment options.
    - [ ] above and below slot should ignore valign property 
- [ ] Item component can take over rendering of all text slots using editorProps.customTextRendering = true.
    This is needed for such items like: Overlay, Button, FramePlayer so that they can handle all mouse events inside and it does not interfere with text objects
- [ ] When switching between different shapes in the same item - its textParts gets reset depending on which text slots are supported by shape
- [ ] When activating in-place text editor for a particular slot - it should display text properties panel


```js
item = {
    textParts: {
        header: {text: 'Hellow', fontSize: 12, font: 'Arial', padding: {...}},
        body: {text: 'asdasdd', ...},
        above: {text: 'sdasd', ...},
        below: {text: 'asdad',...},
        center: {}
    }
}
```



License
---------
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
