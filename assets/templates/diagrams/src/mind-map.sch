struct PinPoint {
    id: 't'
    x: 0
    y: 0
    normal: Vector(0, -1)
}

func findPinPointForItem(item, offset, p2) {
    p1 = Vector(item.w/2, item.h/2) + offset
    v = (p2 - p1).normalized()

    k = item.w/item.h

    warpedV = Vector(v.x, v.y * k)

    allPins = List(
        PinPoint('t', item.w/2, 0,        Vector(0, -1)),
        PinPoint('b', item.w/2, item.h,   Vector(0, 1)),
        PinPoint('l', 0,        item.h/2, Vector(-1, 0)),
        PinPoint('r', item.w,   item.h/2, Vector(1, 0))
    )

    closestPin = allPins.get(0)
    closestDistance = -1000

    pv = p1 + warpedV * 10

    allPins.forEach((pin) => {
        warpedPin = p1 + item.w * pin.normal
        delta = warpedPin - pv
        dSquared = delta * delta

        if (closestDistance < 0 || closestDistance > dSquared) {
            closestDistance = dSquared
            closestPin = pin
        }
    })

    closestPin
}

func createConnectorItem(item, childItem) {
    connector = Item(`connector-${item.id}-${childItem.id}`, `${item.name} -> ${childItem.name}`, 'connector', 0, 0, 100, 50, Map())

    x1 = item.w/2
    y1 = item.h/2

    x2 = childItem.x + childItem.w/2
    y2 = childItem.y + childItem.h/2

    childOffset = Vector(childItem.x, childItem.y)

    pin1 = findPinPointForItem(item, Vector(0, 0), Vector(x2, y2))
    pin2 = findPinPointForItem(childItem, childOffset, Vector(x1, y2))

    connector.shapeProps.set('points', List(
        Map('id', pin1.id, 'x', pin1.x, 'y', pin1.y, 'nx', pin1.normal.x, 'ny', pin1.normal.y),
        Map('id', pin2.id, 'x', pin2.x + childOffset.x, 'y', pin2.y + childOffset.y, 'nx', pin2.normal.x, 'ny', pin2.normal.y)
    ))

    connector.shapeProps.set('sourceItem', `#${item.id}`)
    connector.shapeProps.set('sourcePin', pin1.id)
    connector.shapeProps.set('destinationItem', `#${childItem.id}`)
    connector.shapeProps.set('destinationPin', pin2.id)

    connector
}

items = List()
rootNode = decodeTree(nodes, '|', ':')

rootItem = rootNode.map((node, childItems) => {
    x = parseInt(node.data.get('x'))
    y = parseInt(node.data.get('y'))
    w = parseInt(node.data.get('w'))
    h = parseInt(node.data.get('h'))

    item = Item(node.id, `item ${node.id}`, 'rect', x, y, w, h, Map(), childItems)
    item.args.set('templateIgnoredProps', List('shapeProps.fill', 'shapeProps.strokeColor', 'shapeProps.strokeSize', 'shapeProps.strokePattern'))
    if (node.id != rootNode.id) {
        item.args.set('templateMovement', 'controled')
    }
    item
})

rootItem.name = 'Mind map'
rootItem.w = width
rootItem.h = height

rootItem.traverse((item) => {
    connectors = List()
    item.childItems.forEach((childItem) => {
        connectors.add(createConnectorItem(item, childItem))
    })
    item.childItems.extendList(connectors)
})

on('move', (itemId, item, position) => {
    // move handler is supposed to return a vector that represents where the new position should be
    Vector(position.x, position.y)
})