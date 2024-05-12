padding = 60
controlPadding = 40
controls = List()

allIcons = Map(
    'search', '/assets/art/google-cloud/bigquery/bigquery.svg',
    'time', '/assets/art/azure/General/10006-icon-service-Recent.svg',
    'cloud', '/assets/art/google-cloud/my_cloud/my_cloud.svg',
    "check", "/assets/art/icons/check.svg",
    "cross", "/assets/art/icons/cross.svg",
    "depressed", "/assets/art/icons/depressed.svg",
    "emoji-angry", "/assets/art/icons/emoji-angry.svg",
    "emoji-angry-2", "/assets/art/icons/emoji-angry-2.svg",
    "emoji-cry", "/assets/art/icons/emoji-cry.svg",
    "emoji-dead", "/assets/art/icons/emoji-dead.svg",
    "emoji-hah", "/assets/art/icons/emoji-hah.svg",
    "emoji-happy", "/assets/art/icons/emoji-happy.svg",
    "emoji-heart", "/assets/art/icons/emoji-heart.svg",
    "emoji-puke", "/assets/art/icons/emoji-puke.svg",
    "emoji-rest", "/assets/art/icons/emoji-rest.svg",
    "emoji-rest-2", "/assets/art/icons/emoji-rest-2.svg",
    "emoji-rich", "/assets/art/icons/emoji-rich.svg",
    "emoji-smile", "/assets/art/icons/emoji-smile.svg",
    "emoji-smile-2", "/assets/art/icons/emoji-smile-2.svg",
    "emoji-suprised", "/assets/art/icons/emoji-suprised.svg",
    "emoji-tired", "/assets/art/icons/emoji-tired.svg",
    "emoji-wow", "/assets/art/icons/emoji-wow.svg",
    "heart", "/assets/art/icons/heart.svg",
    "number-0", "/assets/art/icons/number-0.svg",
    "number-1", "/assets/art/icons/number-1.svg",
    "number-2", "/assets/art/icons/number-2.svg",
    "number-3", "/assets/art/icons/number-3.svg",
    "number-4", "/assets/art/icons/number-4.svg",
    "number-5", "/assets/art/icons/number-5.svg",
    "number-6", "/assets/art/icons/number-6.svg",
    "number-7", "/assets/art/icons/number-7.svg",
    "number-8", "/assets/art/icons/number-8.svg",
    "number-9", "/assets/art/icons/number-9.svg",
    "question", "/assets/art/icons/question.svg",
    "size-l", "/assets/art/icons/size-l.svg",
    "size-m", "/assets/art/icons/size-m.svg",
    "size-s", "/assets/art/icons/size-s.svg",
    "size-xl", "/assets/art/icons/size-xl.svg",
    "size-xs", "/assets/art/icons/size-xs.svg",
    "warn", "/assets/art/icons/warn.svg",
)


func getAllAvailableIcons() {
    icons = List()

    allIcons.forEach((url, id) => {
        icons.add(toJSON(Map('id', id, 'url', url)))
    })
    icons
}

func getNodeIcons(node) {
    icons = List()
    if (node.data.has('icons')) {
        iconSet = Set()
        splitString(node.data.get('icons'), ',').forEach((iconId) => {
            if (iconId && !iconSet.has(iconId)) {
                icons.add(iconId)
                iconSet.add(iconId)
            }
        })
    }
    icons
}

func encodeIcons(icons) {
    encoded = ''
    icons.forEach((id, idx) => {
        if (idx > 0) {
            encoded += ','
        }
        encoded += id
    })
    encoded
}


func setNodeIcon(node, iconId) {
    icons = getNodeIcons(node)

    idx = icons.findIndex((id) => { id == iconId })
    if (idx < 0) {
        icons.add(iconId)
    } else {
        icons.remove(idx)
    }

    node.data.set('icons', encodeIcons(icons))
    encodeMindMap()
}

func removeNodeIcon(node, iconId) {
    icons = getNodeIcons(node)
    idx = icons.findIndex((id) => { id == iconId })

    if (idx >= 0) {
        icons.remove(idx)
    }
    node.data.set('icons', encodeIcons(icons))
    encodeMindMap()
}

struct PinPoint {
    id: 't'
    x: 0
    y: 0
    normal: Vector(0, -1)
}

// zone points should be arranged in a counter clock wise polygon
func isPointInsideZone(testPoint, zonePoints) {
    if (zonePoints.size < 3) {
        false
    } else {
        lines = List()

        for (i = 0; i < zonePoints.size - 1; i++) {
            p1 = zonePoints.get(i)
            p2 = zonePoints.get(i+1)
            lines.add(Math.createLineEquation(p2.x, p2.y, p1.x, p1.y))
        }

        isInZone = true
        for (i = 0; i < lines.size && isInZone; i++) {
            if (Math.sideAgainstLine(testPoint.x, testPoint.y, lines.get(i)) < 0) {
                isInZone = false
            }
        }
        isInZone
    }
}


func getPinPointById(pinId, node) {
    if (pinId == 't') {
        PinPoint('t', node.w/2, 0,        Vector(0, -1))
    } else if (pinId == 'b') {
        PinPoint('b', node.w/2, node.h,   Vector(0, 1))
    } else if (pinId == 'l') {
        PinPoint('l', 0,        node.h/2, Vector(-1, 0))
    } else if (pinId == 'r') {
        PinPoint('r', node.w,   node.h/2, Vector(1, 0))
    }
}

rootNode = decodeTree(nodes, ' | ', ';')

func encodeMindMap() {
    nodes = rootNode.encodeTree(' | ', ';')
}

struct SuggestedConnection {
    srcPin: null
    dstPin: null
    zonePoints: List()
}

func findPinsForNodes(node, child) {

    p1 = Vector(0, 0)
    p2 = Vector(node.w, 0)
    p3 = Vector(node.w, node.h)
    p4 = Vector(0, node.h)

    topRightV    = Vector(1, -3)
    bottomLeftV  = -topRightV
    topLeftV     = Vector(-1, -3)
    bottomRightV = -topLeftV

    srcTopPin    = getPinPointById('t', node)
    srcBottomPin = getPinPointById('b', node)
    srcLeftPin   = getPinPointById('l', node)
    srcRightPin  = getPinPointById('r', node)

    dstTopPin    = getPinPointById('t', child)
    dstBottomPin = getPinPointById('b', child)
    dstLeftPin   = getPinPointById('l', child)
    dstRightPin  = getPinPointById('r', child)

    childOffset = Vector(child.x, child.y)

    t = Vector(node.w/2, 0)
    t2 = t + Vector(0, -10)
    b = Vector(node.w/2, node.h)
    b2 = b + Vector(0, 10)

    connections = List(
        () => { SuggestedConnection(srcTopPin, dstRightPin, List(p1 + topLeftV, p1, t, t2)) },
        () => { SuggestedConnection(srcTopPin, dstLeftPin, List(t2, t, p2, p2 + topRightV)) },
        () => { SuggestedConnection(srcBottomPin, dstLeftPin, List(p3 + bottomRightV, p3, b, b2)) },
        () => { SuggestedConnection(srcBottomPin, dstRightPin, List(b2, b, p4, p4 + bottomLeftV)) },

        () => { SuggestedConnection(srcRightPin, dstLeftPin, List(p2 + topRightV, p2, p3, p3 + bottomRightV)) },
        () => { SuggestedConnection(srcLeftPin, dstRightPin, List(p4 + bottomLeftV, p4, p1, p1 + topLeftV)) },
        () => { SuggestedConnection(srcTopPin, dstBottomPin, List(p1 + topLeftV, p1, p2, p2 + topRightV)) },
        () => { SuggestedConnection(srcBottomPin, dstTopPin, List(p3 + bottomRightV, p3, p4, p4 + bottomLeftV)) },
    )

    srcPin = srcRightPin
    dstPin = dstLeftPin
    matches = false

    for (i = 0; i < connections.size && !matches; i++) {
        connection = connections.get(i)()
        srcPin = connection.srcPin
        dstPin = connection.dstPin

        testPoint = Vector(dstPin.x, dstPin.y) + childOffset
        matches = isPointInsideZone(testPoint, connection.zonePoints)
    }

    List(srcPin, dstPin)
}

func prepareConnectorForNode(node, parent) {
    connector = Item(`connector-${parent.id}-${node.id}`, `${node.id} -> ${parent.id}`, 'connector', 0, 0, 100, 50, Map())

    x1 = parent.w/2
    y1 = parent.h/2

    x2 = node.x + node.w/2
    y2 = node.y + node.h/2

    childOffset = Vector(node.x, node.y)

    pins = findPinsForNodes(parent, node)
    pin1 = pins.get(0)
    pin2 = pins.get(1)

    connector.shapeProps.set('points', List(
        Map('id', pin1.id, 'x', pin1.x, 'y', pin1.y, 'nx', pin1.normal.x, 'ny', pin1.normal.y),
        Map('id', pin2.id, 'x', pin2.x + childOffset.x, 'y', pin2.y + childOffset.y, 'nx', pin2.normal.x, 'ny', pin2.normal.y)
    ))

    connector.args.set('templateIgnoredProps', List('name', 'shapeProps.fill', 'shapeProps.stroke*'))

    connector.shapeProps.set('sourceItem', `#${parent.id}`)
    connector.shapeProps.set('sourcePin', pin1.id)
    connector.shapeProps.set('destinationItem', `#${node.id}`)
    connector.shapeProps.set('destinationPin', pin2.id)
    connector.shapeProps.set('sourceCap', 'empty')
    connector.shapeProps.set('destinationCap', capType)
    connector.shapeProps.set('destinationCapSize', capSize)
    connector.shapeProps.set('smoothing', connectorType)

    if (parent.tempData.has('connectors')) {
        parent.tempData.get('connectors').add(connector)
    } else {
        parent.tempData.set('connectors', List(connector))
    }

    pin2.id
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
    p = 0
    if (node.data.has('p')) {
        p = parseInt(node.data.get('p'))
    }

    node.data.set('x', x)
    node.data.set('y', y)
    node.data.set('w', w)
    node.data.set('h', h)
    node.data.set('p', p)

    node.x = x
    node.y = y
    pos = updateAbsoluteNodePosition(node)

    addingControl = (location, placement, cx, cy) => {
        Control(`add_child_${location}`, Map('nodeId', node.id), `createNewChildFor(control.data.nodeId, '${location}')`, cx, cy, 20, 20, '+', placement, node.id)
    }

    if (parent) {
        node.w = w
        node.h = h
        pinId = prepareConnectorForNode(node, parent)
        controls.extendList(List(
            addingControl('top', 'BL', pos.x + node.w / 2 - 10, pos.y - controlPadding),
            addingControl('bottom', 'TL', pos.x + node.w / 2 - 10, pos.y + node.h + controlPadding),
            addingControl('left', 'TR', pos.x - controlPadding, pos.y + node.h / 2 - 10),
            addingControl('right', 'TL', pos.x + node.w + controlPadding, pos.y + node.h / 2 - 10)
        ).filter((control) => {!control.name.startsWith(`add_child_${pinId}`)}))
    } else {
        node.w = width
        node.h = height

        controls.extendList(List(
            addingControl('top', 'BL', node.w / 2 - 10, -controlPadding),
            addingControl('bottom', 'TL', node.w / 2 - 10, node.h + controlPadding),
            addingControl('left', 'TR', -controlPadding, node.h / 2 - 10),
            addingControl('right', 'TL', node.w + controlPadding, node.h / 2 - 10)
        ))
    }
})


func createProgressPaths(percent) {
    R = 50
    angle = 2 * Math.PI * percent / 100

    v1 = Vector(0, -50)
    v2 = v1.rotate(angle)

    p2 = Vector(50, 50) + v2

    L = (Vector(50, 0) - p2).length()

    solution = Math.solveQuadratic(0.5, -R, L*L/8)

    h = 50

    if (solution) {
        H = 0
        if (percent <= 50) {
            H = min(solution.v1, solution.v2)
        } else {
            H = max(solution.v1, solution.v2)
        }
        h = H / L * 100
    }

    List(Map(
        'closed', 'true',
        'pos', 'relative',
        'points', List(
            Map(
                'id', '1',
                't', 'L',
                'x', 50,
                'y', 50,
            ),
            Map(
                'id', '2',
                't', 'A',
                'x', 50,
                'y', 0,
                'h', h
            ),
            Map(
                'id', '3',
                't', 'L',
                'x', p2.x,
                'y', p2.y,
            ),
        )
    ))
}

func createProgressIconItems(nodeId, percent, color, x, y) {
    items = List()

    if (gradientProgress) {
        t = if (percent <= 50) { percent / 50 } else { (percent - 50) / 50 }
        c1 = decodeColor(if (percent <= 50) { (progressColor) } else { progressColor2 })
        c2 = decodeColor(if (percent <= 50) { (progressColor2) } else { progressColor3 })
        color = c1.gradient(c2, t).encode()
    }

    isNotFull = percent < 99.5

    items.add(Item(
        `${nodeId}_progress_stroke`, 'progress container', 'ellipse', x, y, progressSize, progressSize, Map(
            'fill', if (isNotFull) { Map('type', 'none') } else { Map('type', 'solid', 'color', color) },
            'strokeColor', color,
            'strokeSize', 3
        ), List(), Map(
            'mindMapType', 'progress',
            'mindMapNodeId', nodeId,
        )
    ))
    if (percent > 0.5 && isNotFull) {
        items.add(Item(
            `${nodeId}_progress`, 'progress', 'path', x, y, progressSize, progressSize, Map(
                'paths', createProgressPaths(percent),
                'strokeSize', 0,
                'strokeColor', color,
                'fill', Map('type', 'solid', 'color', color)
            ), List(), Map(
                'mindMapType', 'progress',
                'mindMapNodeId', nodeId,
            )
        ))
    }
    items
}

func createNodeIconItems(node) {
    items = List()

    margin = 5

    if (showProgress) {
        percent = 0
        color = progressColor
        if (node.children.size == 0) {
            color = progressColor2
        }
        if (node.data.has('p')) {
            percent = max(0, min(parseInt(node.data.get('p')), 100))
        }
        x = 10
        y = node.h / 2 - progressSize / 2

        items.extendList(createProgressIconItems(node.id, percent, color, x, y))
    }

    progressOffset = if (showProgress) { margin + progressSize } else { 0 }

    getNodeIcons(node).forEach((iconId, idx) => {
        x = (iconSize + margin) * idx + 10 + progressOffset
        y = node.h / 2 - iconSize / 2
        items.add(Item(
            `${node.id}_icon_${iconId}`, iconId, 'image', x, y, iconSize, iconSize, Map('image', allIcons.get(iconId)), List(), Map(
                'mindMapType', 'icon',
                'mindMapIcon', iconId,
                'mindMapNodeId', node.id,
            )
        ))
    })

    items
}

rootItem = rootNode.map((node, childItems) => {
    x = node.data.get('x')
    y = node.data.get('y')
    w = node.data.get('w')
    h = node.data.get('h')

    childItems.extendList(createNodeIconItems(node))

    if (node.tempData.has('connectors')) {
        childItems.extendList(node.tempData.get('connectors'))
    }

    shape = if (node.data.has('s')) { node.data.get('s') } else { 'rect' }

    item = Item(node.id, `item ${node.id}`, shape, x, y, w, h, Map(), childItems, Map(
        'mindMapType', 'node'
    ))
    item.args.set('templateIgnoredProps', List('name', 'shape', 'shapeProps.*'))
    item.locked = false
    if (node.id != rootNode.id) {
        item.args.set('tplArea', 'controlled')
    }
    item.args.set('tplRotation', 'off')
    item.args.set('tplConnector', 'off')

    if (shape == 'none') {
        item.setText('body', 'Add your text...')
    }
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
        w = max(1, node.w)
        h = max(1, node.h)
        shape = if (node.data.has('s')) { node.data.get('s') } else { 'rect' }

        if (node.children.size > 0) {
            childNode = node.children.get(0)
            if (childNode.data.has('s')) {
                shape = if (childNode.data.has('s')) { childNode.data.get('s') } else { shape }
            }

            w = max(1, childNode.w)
            h = max(1, childNode.h)
        }

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

        childNode = TreeNode(uid(), Map('x', x, 'y', y, 'w', w, 'h', h, 's', shape, 'p', 0))
        node.children.add(childNode)

        updateProgress(rootNode)

        encodeMindMap()
    }
}

func shouldNodeShapeSelectorBeDisplayed(selectedItemIds) {
    shown = false
    selectedItemIds.forEach((itemId) => {
        if (rootNode.findById(itemId)) {
            shown = true
        }
    })
    shown
}

func selectShapeForItems(selectedItemIds, panelItem) {
    selectedItemIds.forEach((itemId) => {
        updateItem(itemId, (item) => {
            item.shape = panelItem.shape
            forEach(panelItem.shapeProps, (value, name) => {
                if (name != 'fill') {
                    setObjectField(item.shapeProps, name, value)
                }
            })
            node = rootNode.findById(itemId)
            if (node) {
                node.data.set('s', panelItem.shape)
                encodeMindMap()
            }

            if (panelItem.shape == 'none') {
                if (!item.textSlots.body) {
                    setObjectField(item.textSlots, 'body', toJSON(Map('text', 'Add your text...')))
                }
                if (item.textSlots.body) {
                    if (!item.textSlots.body.text || item.textSlots.body.text == '<p></p>') {
                        setObjectField(item.textSlots.body, 'text', 'Ad your text...')
                    }
                }
            }
        })
    })
}

func shouldNodeIconSelectorBeDisplayed(selectedItemIds) {
    shouldNodeShapeSelectorBeDisplayed(selectedItemIds)
}


func selectIconForItems(selectedItemIds, panelItem) {
    selectedItemIds.forEach((itemId) => {
        node = rootNode.findById(itemId)
        if (node) {
            setNodeIcon(node, panelItem.id)
        }
    })
}

func shouldNodeProgressEditorBeDisplayed(selectedItemIds) {
    if (showProgress) {
        showPanel = false
        selectedItemIds.forEach((itemId) => {
            node = rootNode.findById(itemId)
            if (node && node.children.size == 0) {
                showPanel = true
            }
        })
        showPanel
    } else {
        false
    }
}

func getAllProgressIconItems() {
    List(0, 25, 50, 75, 100).map((percent) => {
        items = createProgressIconItems(`icon-${percent}`, percent, progressColor2, 0, 0)
        Item(`progress_${percent}_container`, `${percent}`, 'none', 2, 2, progressSize, progressSize, Map(), items, Map(
            'mindMapProgress', percent
        )).toJSON()
    })
}

func updateProgress(node) {
    if (node.children.size > 0) {
        sumProgress = 0
        node.children.forEach((childNode) => {
            sumProgress += updateProgress(childNode)
        })

        totalProgress = sumProgress / node.children.size
        node.data.set('p', totalProgress)
        totalProgress
    } else {
        if (node.data.has('p')) {
            node.data.get('p')
        } else {
            0
        }
    }
}

func selectProgressForItems(selectedItemIds, panelItem) {
    selectedItemIds.forEach((itemId) => {
        node = rootNode.findById(itemId)
        if (node && node.children.size == 0) {
            node.data.set('p', panelItem.args.mindMapProgress)
        }
    })

    updateProgress(rootNode)

    encodeMindMap()
}

// triggered when item area changes as a result of edit box modifications
// the handler is supposed to mutate the area object in case the area is changed
func onAreaUpdate(itemId, item, area) {
    node = rootNode.findById(itemId)
    if (node) {
        node.data.set('x', area.x)
        node.data.set('y', area.y)
        node.data.set('w', area.w)
        node.data.set('h', area.h)
        encodeMindMap()
    }
}

// Template special function. Triggered when user deletes templated item
func onDeleteItem(itemId, item) {
    if (item.args.mindMapType == 'icon') {
        node = rootNode.findById(item.args.mindMapNodeId)
        if (node) {
            removeNodeIcon(node, item.args.mindMapIcon)
        }
    } else if (item.args.mindMapType == 'node') {
        node = rootNode.findById(itemId)
        if (node && node.parent) {
            node.parent.children.remove(node.siblingIdx)
            updateProgress(rootNode)
            encodeMindMap()
        }
    }
}

func onCopyItem(itemId, item) {
    node = rootNode.findById(itemId)
    if (node) {
        encodedNode = rootNode.encodeTree(' | ', ';')
        setObjectField(item.args, 'mindMapEncodedNode', encodedNode)
    }
}