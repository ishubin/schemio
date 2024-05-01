padding = 60
controlPadding = 40
controls = List()

struct PinPoint {
    id: 't'
    x: 0
    y: 0
    normal: Vector(0, -1)
}

func findPinPointForNode(node, offset, p2) {
    p1 = Vector(node.w/2, node.h/2) + offset
    v = (p2 - p1).normalized()

    k = node.w/node.h

    warpedV = Vector(v.x, v.y * k)

    allPins = List(
        PinPoint('t', node.w/2, 0,        Vector(0, -1)),
        PinPoint('b', node.w/2, node.h,   Vector(0, 1)),
        PinPoint('l', 0,        node.h/2, Vector(-1, 0)),
        PinPoint('r', node.w,   node.h/2, Vector(1, 0))
    )

    closestPin = allPins.get(0)
    closestDistance = -1000

    pv = p1 + warpedV * 10

    allPins.forEach((pin) => {
        warpedPin = p1 + node.w * pin.normal
        delta = warpedPin - pv
        dSquared = delta * delta

        if (closestDistance < 0 || closestDistance > dSquared) {
            closestDistance = dSquared
            closestPin = pin
        }
    })

    closestPin
}

rootNode = decodeTree(nodes, '|', ':')

func encodeMindMap() {
    nodes = rootNode.encodeTree('|', ':')
}

func prepareConnectorForNode(node, parent) {
    connector = Item(`connector-${parent.id}-${node.id}`, `${node.id} -> ${parent.id}`, 'connector', 0, 0, 100, 50, Map())

    x1 = parent.w/2
    y1 = parent.h/2

    x2 = node.x + node.w/2
    y2 = node.y + node.h/2

    childOffset = Vector(node.x, node.y)

    pin1 = findPinPointForNode(parent, Vector(0, 0), Vector(x2, y2))
    pin2 = findPinPointForNode(node, childOffset, Vector(x1, y2))

    connector.shapeProps.set('points', List(
        Map('id', pin1.id, 'x', pin1.x, 'y', pin1.y, 'nx', pin1.normal.x, 'ny', pin1.normal.y),
        Map('id', pin2.id, 'x', pin2.x + childOffset.x, 'y', pin2.y + childOffset.y, 'nx', pin2.normal.x, 'ny', pin2.normal.y)
    ))

    connector.shapeProps.set('sourceItem', `#${parent.id}`)
    connector.shapeProps.set('sourcePin', pin1.id)
    connector.shapeProps.set('destinationItem', `#${node.id}`)
    connector.shapeProps.set('destinationPin', pin2.id)

    if (parent.tempData.has('connectors')) {
        parent.tempData.get('connectors').add(connector)
    } else {
        parent.tempData.set('connectors', List(connector))
    }
}

ABS_POS = 'absolutePosition'

func updateAbsoluteNodePosition(node) {
    x = parseInt(node.data.get('x'))
    y = parseInt(node.data.get('y'))
    localPos = Vector(x, y)

    pos = (if (node.parent) {
        if (node.parent.tempData.has(ABS_POS)) {
            node.parent.tempData.get(ABS_POS) + localPos
        } else {
            parentPos = updateAbsoluteNodePosition(node.parent)
            parentPos + localPos
        }
    } else {
        localPos
    })

    node.tempData.set(ABS_POS, pos)

    pos
}

rootNode.traverse((node, parent) => {
    x = parseInt(node.data.get('x'))
    y = parseInt(node.data.get('y'))
    w = parseInt(node.data.get('w'))
    h = parseInt(node.data.get('h'))
    node.data.set('x', x)
    node.data.set('y', y)
    node.data.set('w', w)
    node.data.set('h', h)

    pos = updateAbsoluteNodePosition(node)

    parentX = if (parent) { parent.x } else { 0 }
    parentY = if (parent) { parent.y } else { 0 }
    node.x = x + parentX
    node.y = y + parentY

    addingControl = (location, placement, cx, cy) => {
        Control(`addChild_${location}`, Map('nodeId', node.id), `createNewChildFor(control.data.nodeId, '${location}')`, cx, cy, 20, 20, '+', placement, node.id)
    }

    if (parent) {
        node.w = w
        node.h = h
        prepareConnectorForNode(node, parent)
    } else {
        node.w = width
        node.h = height

        controls.extendList(List(
            addingControl('top', 'BL', w / 2 - 10, -controlPadding),
            addingControl('bottom', 'TL', w / 2 - 10, h + controlPadding),
            addingControl('left', 'TR', -controlPadding, h / 2 - 10),
            addingControl('right', 'TL', w + controlPadding, h / 2 - 10),
        ))
    }
})


rootItem = rootNode.map((node, childItems) => {
    x = node.data.get('x')
    y = node.data.get('y')
    w = node.data.get('w')
    h = node.data.get('h')

    if (node.tempData.has('connectors')) {
        childItems.extendList(node.tempData.get('connectors'))
    }

    item = Item(node.id, `item ${node.id}`, 'rect', x, y, w, h, Map(), childItems)
    item.args.set('templateIgnoredProps', List('shapeProps.fill', 'shapeProps.strokeColor', 'shapeProps.strokeSize', 'shapeProps.strokePattern'))
    item.locked = false
    if (node.id != rootNode.id) {
        item.args.set('tplArea', 'controlled')
    }
    item.args.set('tplRotation', 'off')
    item.args.set('tplConnector', 'off')
    item
})

rootItem.name = 'Mind map'
rootItem.w = width
rootItem.h = height


func createNewChildFor(nodeId, placement) {
    node = rootNode.findById(nodeId)
    if (node) {
        x = 0
        y = 0
        w = 160
        h = 30

        if (placement == 'top') {
            y = - padding - h
            x = node.w / 2 - w / 2
        } else if (placement == 'bottom') {
            y = node.h + padding
            x = node.w / 2 - w / 2
        } else if (placement == 'left') {
            x = - padding - w
            y = node.h / 2 - h / 2
        } else if (placement == 'right') {
            x = node.w + padding
            y = node.h / 2 - h / 2
        }

        childNode = TreeNode(uid(), Map('x', x, 'y', y, 'w', w, 'h', h))
        node.children.add(childNode)

        encodeMindMap()
    }
}

// triggered when item area changes as a result of edit box modifications
// the handler is supposed to mutate the area object in case the area is changed
on('area', (itemId, item, area) => {
    node = rootNode.findById(itemId)
    if (node) {
        node.data.set('x', area.x)
        node.data.set('y', area.y)
        encodeMindMap()
    }
})