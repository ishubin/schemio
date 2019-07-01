
Refactoring items into single type
------------------------------------

```javascript
let sampleItem = {
    id: "ewt32452tew",
    // (x, y - location), (w, h - size), (r - rotation)
    area:  {x: 0, y: 0, w: 100, h: 20, r: 0},

    // used only in edit mode in order to freeze/unfreeze item area.
    locked: false,

    // Used for searching items and is displayed in the item list
    name: "A name of an item",

    // A description that is shown on the sidebar (or as a tooltip) when item is selected
    description: "...",

    // Displayed on the item. This is nice for comments, simple text or component with properties
    text: "This text will be rendered on top of SVG item",

    tags: ['Java', 'Spring', 'Service', 'REST', 'HTTP'],


    //TODO Figure out how we can specify shapes and their properties
    /*
    Each shape should have it's own set of properties.
    e.g. in-built options: ['rect', 'ellipse', 'diamond', ...]
    Also it is possible to embed a custom svg shape by using JSON encoded object with "args" and "svg" fields
    An "svg" field contains a Vue template for building and asvg item. It will be rendered like any Vue component with args provided as a data.

    here is an example of syntax for custom options
        {
            "args": {"headMargin": {"value": 30, "type": "Number", "name": "Head Margin", "description": "Distance from head to properties separator"}}
            "svg": "<rect x=\"0\" y=\"0\" :width=\"width\" :height=\"height\"></rect>"
        }

        List of shape argument types:
            - Number
            - Float
            - Text
            - RichText
            - Color
            - StrokePattern
            - Image
    */
    shape: 'rect',

    // TODO specify links
    links: [],

    // Here goes all styling that is displayed under "Style" panel
    style: {
        // Specifies how the details panel is presented when user clicks the item.
        // Could be ['none', 'sidebar', 'tooltip']
        detailsMode: 'sidebar',

        // Specifies whether the name should be displayed. In case it is an overlay - the default will be false
        nameDisplayed: true,
        nameFontFamily: 'Helvetica',
        nameFontSize: 16,
        nameColor: '#324',
        // used only in case image is null
        backgroundColor: '#436'
        backgroundImage: 'http://localhost/some/path/to/image.png',
        strokeColor: '#345',
        stringSize: 1
        // options: ['line', 'dotted', 'dashed']
        strokePattern: 'line'
        textMarginTop: 0,
        textMarginBottom: 0,
        textMarginLeft: 0,
        textMarginRight: 0
        textColor: '#111',
        textFontSize: 16
        textFontFamily: 'Helvetica',

        // Represents the state when item is selected. This allows to modify any styling property of an item.
        // Only the properties that are specified in `activeState` will be overriden on item select.
        activeState: {
            nameFontSize: 32
        },


        // All shape specific properties will also be specified here.
        // This way any custom shape can make use of it's own + global styling properties
    }
}

```