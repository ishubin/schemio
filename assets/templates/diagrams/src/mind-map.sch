padding = 120
controlPadding = 40
controls = List()
rootNode = null
ABS_POS = 'absolutePosition'

connectorDefaultColor = 'rgba(80,80,80,1.0)'

// rootItem is used for building all of the template items
rootItem = null

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
    local icons = List()

    allIcons.forEach((url, id) => {
        icons.add(toJSON(Map('id', id, 'url', url)))
    })
    icons
}

func getNodeIcons(node) {
    local icons = List()
    if (node.data.has('icons')) {
        local iconSet = Set()
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
    local encoded = ''
    icons.forEach((id, idx) => {
        if (idx > 0) {
            encoded += ','
        }
        encoded += id
    })
    encoded
}


func setNodeIcon(node, iconId) {
    local icons = getNodeIcons(node)

    local idx = icons.findIndex((id) => { id == iconId })
    if (idx < 0) {
        icons.add(iconId)
    } else {
        icons.remove(idx)
    }

    node.data.set('icons', encodeIcons(icons))
    encodeMindMap()
}

func removeNodeIcon(node, iconId) {
    local icons = getNodeIcons(node)
    local idx = icons.findIndex((id) => { id == iconId })

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
        local lines = List()

        for (i = 0; i < zonePoints.size - 1; i++) {
            local p1 = zonePoints.get(i)
            local p2 = zonePoints.get(i+1)
            lines.add(Math.createLineEquation(p2.x, p2.y, p1.x, p1.y))
        }

        local isInZone = true
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


func encodeMindMap() {
    nodes = rootNode.encodeTree(' | ', ';')
}

struct SuggestedConnection {
    srcPin: null
    dstPin: null
    zonePoints: List()
}

func findPinsForNodes(node, child) {
    local p1 = Vector(0, 0)
    local p2 = Vector(node.w, 0)
    local p3 = Vector(node.w, node.h)
    local p4 = Vector(0, node.h)

    local topRightV    = Vector(1, -3)
    local bottomLeftV  = -topRightV
    local topLeftV     = Vector(-1, -3)
    local bottomRightV = -topLeftV

    local srcTopPin    = getPinPointById('t', node)
    local srcBottomPin = getPinPointById('b', node)
    local srcLeftPin   = getPinPointById('l', node)
    local srcRightPin  = getPinPointById('r', node)

    local dstTopPin    = getPinPointById('t', child)
    local dstBottomPin = getPinPointById('b', child)
    local dstLeftPin   = getPinPointById('l', child)
    local dstRightPin  = getPinPointById('r', child)

    local childOffset = Vector(child.x, child.y)

    local t = Vector(node.w/2, 0)
    local t2 = t + Vector(0, -10)
    local b = Vector(node.w/2, node.h)
    local b2 = b + Vector(0, 10)

    local connections = List(
        () => { SuggestedConnection(srcTopPin, dstRightPin, List(p1 + topLeftV, p1, t, t2)) },
        () => { SuggestedConnection(srcTopPin, dstLeftPin, List(t2, t, p2, p2 + topRightV)) },
        () => { SuggestedConnection(srcBottomPin, dstLeftPin, List(p3 + bottomRightV, p3, b, b2)) },
        () => { SuggestedConnection(srcBottomPin, dstRightPin, List(b2, b, p4, p4 + bottomLeftV)) },

        () => { SuggestedConnection(srcRightPin, dstLeftPin, List(p2 + topRightV, p2, p3, p3 + bottomRightV)) },
        () => { SuggestedConnection(srcLeftPin, dstRightPin, List(p4 + bottomLeftV, p4, p1, p1 + topLeftV)) },
        () => { SuggestedConnection(srcTopPin, dstBottomPin, List(p1 + topLeftV, p1, p2, p2 + topRightV)) },
        () => { SuggestedConnection(srcBottomPin, dstTopPin, List(p3 + bottomRightV, p3, p4, p4 + bottomLeftV)) },
    )

    local srcPin = srcRightPin
    local dstPin = dstLeftPin
    local matches = false

    for (local i = 0; i < connections.size && !matches; i++) {
        local connection = connections.get(i)()
        srcPin = connection.srcPin
        dstPin = connection.dstPin

        local testPoint = Vector(dstPin.x, dstPin.y) + childOffset
        matches = isPointInsideZone(testPoint, connection.zonePoints)
    }

    List(srcPin, dstPin)
}

struct PathPoint {
    t: 'B'
    x: 0
    y: 0
    x1: 0
    y1: 0
    x2: 0
    y2: 0
}

func updatePrettyConnector(connector, pin1, pin2, childOffset, node, parent) {
    connector.id = `connector-pretty-${parent.id}-${node.id}`
    connector.shape = 'path'

    // rotating pin by 90 degrees clockwise
    local Vx = -pin1.normal.y * capSize / 2
    local Vy = pin1.normal.x * capSize / 2

    local d1 = 0
    local d2 = 0

    if (abs(pin1.normal.x * pin2.normal.x + pin1.normal.x * pin2.normal.x) > 0.5) {
        // the normals are not perpendicular to each other
        // local d = sqrt((pin2.x + childOffset.x - pin1.x) * (pin2.x + childOffset.x - pin1.x) + (pin2.y + childOffset.y - pin1.y) * (pin2.y + childOffset.y - pin1.y)) / 2
        local x2 = pin2.x + childOffset.x
        local y2 = pin2.y + childOffset.y
        // creating line that is perpendicular to the pin1 normal
        local line = Math.createLineEquation(x2, y2, x2 - pin1.normal.y, y2 + pin1.normal.x)
        d1 = Math.distanceFromPointToLine(pin1.x, pin1.y, line) / 2
        d2 = d1
    } else {
        // normals are perpendicular to each other
        local x2 = pin2.x + childOffset.x
        local y2 = pin2.y + childOffset.y
        local line2 = Math.createLineEquation(x2, y2, x2 + pin2.normal.x, y2 + pin2.normal.y)
        d1 = Math.distanceFromPointToLine(pin1.x, pin1.y, line2) / 2

        local line1 = Math.createLineEquation(pin1.x, pin1.y, pin1.x + pin1.normal.x, pin1.y + pin1.normal.y)
        d2 = Math.distanceFromPointToLine(x2, y2, line1) / 2
    }

    local Nx = pin1.normal.x * d1
    local Ny = pin1.normal.y * d1
    local Mx = pin2.normal.x * d2
    local My = pin2.normal.y * d2

    local Ax = pin1.x + Vx
    local Ay = pin1.y + Vy
    local Bx = pin1.x - Vx
    local By = pin1.y - Vy

    local minX = min(Ax, Bx, pin1.x, pin2.x + childOffset.x)
    local maxX = max(Ax, Bx, pin1.x, pin2.x + childOffset.x)
    local minY = min(Ay, By, pin1.y, pin2.y + childOffset.y)
    local maxY = max(Ay, By, pin1.y, pin2.y + childOffset.y)

    local points = List(
        PathPoint('B', Ax, Ay, Nx, Ny, -Vx, -Vy),
        PathPoint('B', Bx, By, Vx, Vy, Nx, Ny),
        PathPoint('B', pin2.x + childOffset.x, pin2.y + childOffset.y, Mx, My, Mx, My),
    )

    local dx = maxX - minX
    local dy = maxY - minY

    if (dx > 0.0001 && dy > 0.0001) {
        points.forEach((p) => {
            p.x = 100 * (p.x - minX) / dx
            p.y = 100 * (p.y - minY) / dy
            p.x1 = 100 * p.x1 / dx
            p.y1 = 100 * p.y1 / dy
            p.x2 = 100 * p.x2 / dx
            p.y2 = 100 * p.y2 / dy
        })
    }

    connector.x = minX
    connector.y = minY
    connector.w = dx
    connector.h = dy

    connector.shapeProps.set('paths', List(
        Map(
            'id', 'a',
            'closed', true,
            'pos', 'relative',
            'points', points
        )
    ))
    connector.shapeProps.set('strokeColor', connectorDefaultColor)
    connector.shapeProps.set('strokeSize', 2)
    connector.shapeProps.set('fill', Map('type', 'solid', 'color', connectorDefaultColor))
}

func updateConnector(connector, pin1, pin2, childOffset, node, parent) {
    connector.args.set('templateIgnoredProps', List('name', 'shapeProps.fill', 'shapeProps.stroke*'))

    if (connectorType == 'pretty') {
        updatePrettyConnector(connector, pin1, pin2, childOffset, node, parent)
    } else {
        connector.shapeProps.set('points', List(
            Map('id', pin1.id, 'x', pin1.x, 'y', pin1.y, 'nx', pin1.normal.x, 'ny', pin1.normal.y),
            Map('id', pin2.id, 'x', pin2.x + childOffset.x, 'y', pin2.y + childOffset.y, 'nx', pin2.normal.x, 'ny', pin2.normal.y)
        ))

        connector.shapeProps.set('strokeColor', connectorDefaultColor)
        connector.shapeProps.set('sourceItem', `#${parent.id}`)
        connector.shapeProps.set('sourcePin', pin1.id)
        connector.shapeProps.set('destinationItem', `#${node.id}`)
        connector.shapeProps.set('destinationPin', pin2.id)
        connector.shapeProps.set('sourceCap', 'empty')
        connector.shapeProps.set('destinationCap', capType)
        connector.shapeProps.set('destinationCapSize', capSize)
        connector.shapeProps.set('smoothing', connectorType)
    }
}


func updateConnectorForMovingNode(node) {
    local parent = node.parent
    local connectorId = if (connectorType == 'pretty') {
        `connector-pretty-${parent.id}-${node.id}`
    } else {
        `connector-${parent.id}-${node.id}`
    }

    local connector = Item(connectorId, `${node.id} -> ${parent.id}`, 'connector', 0, 0, 100, 50, Map())
    local childOffset = Vector(node.x, node.y)
    local pins = findPinsForNodes(parent, node)
    local pin1 = pins.get(0)
    local pin2 = pins.get(1)
    updateConnector(connector, pin1, pin2, childOffset, node, parent)

    updateItem(connectorId, (item) => {
        item.shape = connector.shape
        item.area.x = connector.x
        item.area.y = connector.y
        item.area.w = connector.w
        item.area.h = connector.h
        item.shapeProps = toJSON(connector.shapeProps)
    })
}

func prepareConnectorForNode(node, parent) {
    local connector = Item(`connector-${parent.id}-${node.id}`, `${node.id} -> ${parent.id}`, 'connector', 0, 0, 100, 50, Map())

    local childOffset = Vector(node.x, node.y)

    local pins = findPinsForNodes(parent, node)
    local pin1 = pins.get(0)
    local pin2 = pins.get(1)

    updateConnector(connector, pin1, pin2, childOffset, node, parent)

    if (parent.tempData.has('connectors')) {
        parent.tempData.get('connectors').add(connector)
    } else {
        parent.tempData.set('connectors', List(connector))
    }

    pin2.id
}


func updateAbsoluteNodePosition(node) {
    local x = parseInt(node.data.get('x'))
    local y = parseInt(node.data.get('y'))
    local localPos = Vector(x, y)

    local pos = (if (node.parent) {
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


func createProgressIconItems(nodeId, percent, color, x, y) {
    local items = List()

    if (gradientProgress) {
        local t = if (percent <= 50) { percent / 50 } else { (percent - 50) / 50 }
        local c1 = decodeColor(if (percent <= 50) { (progressColor) } else { progressColor2 })
        local c2 = decodeColor(if (percent <= 50) { (progressColor2) } else { progressColor3 })
        color = c1.gradient(c2, t).encode()
    }

    local isNotFull = percent < 99.5

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
            `${nodeId}_progress`, 'progress', 'pie_segment', x, y, progressSize, progressSize, Map(
                'strokeSize', 0,
                'strokeColor', color,
                'fill', Map('type', 'solid', 'color', color),
                'percent', percent
            ), List(), Map(
                'mindMapType', 'progress',
                'mindMapNodeId', nodeId,
            )
        ))
    }
    items
}

func createNodeIconItems(node) {
    local items = List()

    local margin = 5

    if (showProgress) {
        local percent = 0
        local color = progressColor
        if (node.children.size == 0) {
            color = progressColor2
        }
        if (node.data.has('p')) {
            percent = max(0, min(parseInt(node.data.get('p')), 100))
        }
        local x = 10
        local y = node.h / 2 - progressSize / 2

        items.extendList(createProgressIconItems(node.id, percent, color, x, y))
    }

    local progressOffset = if (showProgress) { margin + progressSize } else { 0 }

    getNodeIcons(node).forEach((iconId, idx) => {
        local x = (iconSize + margin) * idx + 10 + progressOffset
        local y = node.h / 2 - iconSize / 2
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

func buildTemplateItems(rootNode) {
    rootNode.map((node, childItems) => {
        local x = node.data.get('x')
        local y = node.data.get('y')
        local w = node.data.get('w')
        local h = node.data.get('h')

        childItems.extendList()

        createNodeIconItems(node).forEach((iconItem, i) => {
            childItems.insert(i, iconItem)
        })

        if (node.tempData.has('connectors')) {
            local connectors = node.tempData.get('connectors')
            if (connectors) {
                connectors.forEach((connector, i) => {
                    childItems.insert(i, connector)
                })
            }
        }

        local shape = if (node.data.has('s')) { node.data.get('s') } else { 'rect' }

        local item = Item(node.id, `item ${node.id}`, shape, x, y, w, h, Map(), childItems, Map(
            'mindMapType', 'node'
        ))

        if (node.tempData.has('sourceItem')) {
            srcItem = node.tempData.get('sourceItem')
            if (srcItem) {
                item.shape = srcItem.shape
                item.shapeProps = fromJSON(srcItem.shapeProps)
                item.textSlots = fromJSON(srcItem.textSlots)
            }
        } else {
            item.textSlots = Map('body', Map(
                'text', '',
                'paddingLeft', 5,
                'paddingRight', 5,
                'paddingTop', 5,
                'paddingBottom', 5,
            ))
        }

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
}

func findProperPositionValue(node, placement) {
    local values = List()

    node.children.forEach((childNode) => {
        if (placement == 'top') {
            if (childNode.y < 0) {
                values.add(childNode.y)
            }
        } else if (placement == 'bottom') {
            if (childNode.y > 0) {
                values.add(childNode.y)
            }
        } else if (placement == 'left') {
            if (childNode.x < 0) {
                values.add(childNode.x)
            }
        } else if (placement == 'right') {
            if (childNode.x > 0) {
                values.add(childNode.x)
            }
        }
    })

    values.sort((a, b) => { if (a < b) { -1 } else { 1 } })

    local w = max(1, node.w)
    local h = max(1, node.h)

    if (values.size == 0) {
        if (placement == 'top') {
            - padding - h
        } else if (placement == 'bottom') {
            node.h + padding
        } else if (placement == 'left') {
            - padding - w
        } else if (placement == 'right') {
            node.w + padding
        }
    } else {
        local i = floor(values.size / 2)
        values.get(i)
    }
}

func createNewChildFor(nodeId, placement) {
    local node = rootNode.findById(nodeId)
    if (node) {
        local x = 0
        local y = 0
        local w = max(1, node.w)
        local h = max(1, node.h)
        local shape = if (node.data.has('s')) { node.data.get('s') } else { 'rect' }

        if (node.children.size > 0) {
            local childNode = node.children.get(0)
            if (childNode.data.has('s')) {
                shape = if (childNode.data.has('s')) { childNode.data.get('s') } else { shape }
            }

            w = max(1, childNode.w)
            h = max(1, childNode.h)
        }

        local correctiveVector = Vector(0, h * 0.1)

        if (placement == 'top') {
            y = findProperPositionValue(node, placement)
            x = node.w / 2 - w / 2
            correctiveVector = Vector(w * 0.2, 0)
        } else if (placement == 'bottom') {
            y = findProperPositionValue(node, placement)
            x = node.w / 2 - w / 2
            correctiveVector = Vector(w * 0.2, 0)
        } else if (placement == 'left') {
            x = findProperPositionValue(node, placement)
            y = node.h / 2 - h / 2
        } else if (placement == 'right') {
            x = findProperPositionValue(node, placement)
            y = node.h / 2 - h / 2
        }

        local childAreas = node.children.map((childNode) => { Area(childNode.x, childNode.y, childNode.w, childNode.h) })

        func overlapsChildren(area) {
            local overlaps = false
            for (local i = 0; !overlaps && i < childAreas.size; i++) {
                overlaps = area.overlaps(childAreas.get(i))
            }
            overlaps
        }

        local overlaps = true
        local tries = 0

        local area

        while(overlaps && tries < 1000) {
            local direction = if (tries % 2 == 0) { 1 } else { -1 }
            local displacement = correctiveVector * tries * direction
            area = Area(x + displacement.x, y + displacement.y, w, h)
            overlaps = overlapsChildren(area)
            tries++
        }

        local childNode = TreeNode(uid(), Map('x', area.x, 'y', area.y, 'w', w, 'h', h, 's', shape, 'p', 0))
        node.children.add(childNode)

        updateProgress(rootNode)

        encodeMindMap()
    }
}

func shouldNodeShapeSelectorBeDisplayed(selectedItemIds) {
    local shown = false
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
            local node = rootNode.findById(itemId)
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
        local node = rootNode.findById(itemId)
        if (node) {
            setNodeIcon(node, panelItem.id)
        }
    })
}

func shouldNodeProgressEditorBeDisplayed(selectedItemIds) {
    if (showProgress) {
        local showPanel = false
        selectedItemIds.forEach((itemId) => {
            local node = rootNode.findById(itemId)
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
        local sumProgress = 0
        node.children.forEach((childNode) => {
            sumProgress += updateProgress(childNode)
        })

        local totalProgress = sumProgress / node.children.size
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
        local node = rootNode.findById(itemId)
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
    local node = rootNode.findById(itemId)
    if (node) {
        node.data.set('x', area.x)
        node.data.set('y', area.y)
        node.data.set('w', area.w)
        node.data.set('h', area.h)

        if (node.parent) {
            updateConnectorForMovingNode(node)
        }
        encodeMindMap()
    }
}

// Template special function. Triggered when user deletes templated item
func onDeleteItem(itemId, item) {
    local node
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
    local node = rootNode.findById(itemId)
    if (node) {
        encodedNode = node.encodeTree(' | ', ';')
        setObjectField(item.args, 'mindMap_EncodedNode', encodedNode)
    }
}

func onPasteItems(itemId, items) {
    local dstNode = rootNode.findById(itemId)
    if (dstNode) {
        items.forEach((item) => {
            if (item.args && item.args.mindMap_EncodedNode) {
                local newRootNode = decodeTree(item.args.mindMap_EncodedNode, ' | ', ';')

                local nodesById = Map()
                newRootNode.traverse((node) => {
                    nodesById.set(node.id, node)
                    node.x = parseInt(node.data.get('x'))
                    node.y = parseInt(node.data.get('y'))
                    node.w = parseInt(node.data.get('w'))
                    node.h = parseInt(node.data.get('h'))
                    node.id = uid()
                })

                local traverseItems = (item) => {
                    if (item.args.templated && item.args.templatedId && nodesById.has(item.args.templatedId)) {
                        local node = nodesById.get(item.args.templatedId)
                        // this will be used when building items to make sure that all shapeProps and textSlots fields are copied as well
                        // as those could be overriden by the user
                        node.tempData.set('sourceItem', item)
                    }
                    if (item.childItems) {
                        item.childItems.forEach(traverseItems)
                    }
                }
                traverseItems(item)
                newRootNode.attachTo(dstNode)

                if (dstNode.parent && dstNode.x < 0) {
                    newRootNode.x = - padding - newRootNode.w
                    newRootNode.y = 0
                } else {
                    newRootNode.x = dstNode.w + padding
                    newRootNode.y = 0
                }
                newRootNode.data.set('x', newRootNode.x)
                newRootNode.data.set('y', newRootNode.y)
                autoAlignChildNodes(newRootNode, newRootNode.x < 0)
            }
        })

        reindexTree(rootNode)
        updateProgress(rootNode)
        rootItem = buildTemplateItems(rootNode)
        rootItem.name = 'Mind map'
        rootItem.w = width
        rootItem.h = height

        encodeMindMap()
    }
}


func autoAlignChildNodes(node, toLeft) {
    local vPad = 20
    local totalHeight = node.children.size * vPad

    node.children.forEach((childNode) => {
        totalHeight += childNode.h
    })

    local y = node.h/2 - totalHeight/2

    node.children.forEach((childNode) => {
        childNode.y = y
        y = y + childNode.h + vPad

        if (toLeft) {
            childNode.x = -childNode.w - padding
        } else {
            childNode.x = node.w + padding
        }

        childNode.data.set('x', childNode.x)
        childNode.data.set('y', childNode.y)
        autoAlignChildNodes(childNode, toLeft)
    })
}


func reindexTree(rootNode) {
    rootNode.traverse((node, parent) => {
        local x = parseInt(node.data.get('x'))
        local y = parseInt(node.data.get('y'))
        local w = parseInt(node.data.get('w'))
        local h = parseInt(node.data.get('h'))
        local p = 0
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
        local pos = updateAbsoluteNodePosition(node)

        local addingControl = (location, placement, cx, cy) => {
            Control(`add_child_${location}`, Map('nodeId', node.id), `createNewChildFor(control.data.nodeId, '${location}')`, cx, cy, 20, 20, '+', placement, node.id)
        }

        if (parent) {
            node.w = w
            node.h = h
            local srcPinId = prepareConnectorForNode(node, parent)
            if (srcPinId == 't') {
                controls.add(addingControl('bottom', 'TL', pos.x + node.w / 2 - 10, pos.y + node.h + controlPadding))
            } else if (srcPinId == 'b') {
                controls.add(addingControl('top', 'BL', pos.x + node.w / 2 - 10, pos.y - controlPadding))
            } else if (srcPinId == 'l') {
                controls.add(addingControl('right', 'TL', pos.x + node.w + controlPadding, pos.y + node.h / 2 - 10))
            } else if (srcPinId == 'r') {
                controls.add(addingControl('left', 'TR', pos.x - controlPadding, pos.y + node.h / 2 - 10))
            }
        } else {
            node.w = width
            node.h = height

            controls.extendList(List(
                addingControl('left', 'TR', -controlPadding, node.h / 2 - 10),
                addingControl('right', 'TL', node.w + controlPadding, node.h / 2 - 10)
            ))
        }
    })
}


func shouldNodeOperationsPanelBeDisplayed(selectedItemIds) {
    shouldNodeShapeSelectorBeDisplayed(selectedItemIds)
    local shown = false
    selectedItemIds.forEach((itemId) => {
        node = rootNode.findById(itemId)
        if (node && node.parent) {
            shown = true
        }
    })
    shown
}

func onOperationsPanelClick(selectedItemIds, panelItem) {
    selectedItemIds.forEach((itemId) => {
        node = rootNode.findById(itemId)
        if (node) {
            if (panelItem.id == 'insert-new-parent' && node.parent) {
                insertNewParentFor(node)
            } else if (panelItem.id == 'delete-node-preserve-children' && node.parent) {
                deleteNodePreservingChildren(node)
            }
        }
    })
}

func insertNewParentFor(node) {
    local oldParent = node.parent
    local dx = node.x - node.parent.x
    local dy = node.y - node.parent.y

    local found = false
    for (local i = 0; !found && i < node.parent.children.size; i++) {
        local childNode = node.parent.children.get(i)
        if (childNode.id == node.id) {
            found = true
            node.parent.children.remove(i)
        }
    }

    local newParent = TreeNode(uid())
    node.data.forEach((value, name) => { newParent.data.set(name, value) })
    newParent.x = node.x
    newParent.y = node.y
    newParent.w = node.w
    newParent.h = node.h

    node.attachTo(newParent)
    newParent.attachTo(oldParent)
    updateProgress(rootNode)
    encodeMindMap()
}

func deleteNodePreservingChildren(node) {
    local found = false
    local parent = node.parent
    for (local i = 0; !found && i < parent.children.size; i++) {
        if (node.id == parent.children.get(i).id) {
            parent.children.remove(i)
            local oldSize = parent.children.size - 1
            parent.children.extendList(node.children)
            node.children.forEach((childNode, idx) => {
                childNode.parent = parent
                childNode.siblingIdx = oldSize + idx
            })
        }
    }

    updateProgress(rootNode)
    encodeMindMap()
}

rootNode = decodeTree(nodes, ' | ', ';')
reindexTree(rootNode)

 if (context.phase == 'build') {
    rootItem = buildTemplateItems(rootNode)
    rootItem.name = 'Mind map'
    rootItem.w = width
    rootItem.h = height
}
