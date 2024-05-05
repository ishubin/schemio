
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
}

