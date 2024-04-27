
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


    traverse(callback) {
        this.childItems.forEach((childItem) => {
            childItem.traverse(callback)
        })
        callback(this)
    }

    getArgs() {
        toJSON(this.args)
    }
}

