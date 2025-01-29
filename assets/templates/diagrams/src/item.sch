
struct Item {
    id: uid()
    name: ''
    shape: 'rect'
    x: 0
    y: 0
    w: 100
    h: 50
    shapeProps: Map()
    childItems: List()
    args: Map()
    locked: true
    textSlots: Map()
    description: ""


    traverse(callback) {
        this.childItems.forEach((childItem) => {
            childItem.traverse(callback)
        })
        callback(this)
    }

    getArgs() {
        toJSON(this.args)
    }

    setText(slotName, text) {
        if (!this.textSlots.has(slotName)) {
            this.textSlots.set(slotName, Map('text', text))
        } else {
            this.textSlots.get(slotName).set('text', text)
        }
    }

    toJSON() {
        childItems = this.childItems.map((childItem) => { childItem.toJSON() })
        result = toJSON(Map(
            'id', this.id,
            'childItems', childItems,
            'name', this.name,
            'description', this.description,
            'shape', this.shape,
            'area', Map('x', this.x, 'y', this.y, 'w', this.w, 'h', this.h, 'r', 0, 'sx', 1, 'sy', 1, 'px', 0.5, 'py', 0.5),
            'shapeProps', this.shapeProps,
            'args', this.args,
            'locked', this.locked,
            'textSlots', this.textSlots,
        ))

        result
    }
}

