padding = 60
controlPadding = 40
controls = List()
rootNode = null
ABS_POS = 'absolutePosition'

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

func prepareConnectorForNode(node, parent) {
    local connector = Item(`connector-${parent.id}-${node.id}`, `${node.id} -> ${parent.id}`, 'connector', 0, 0, 100, 50, Map())

    local x1 = parent.w/2
    local y1 = parent.h/2

    local x2 = node.x + node.w/2
    local y2 = node.y + node.h/2

    local childOffset = Vector(node.x, node.y)

    local pins = findPinsForNodes(parent, node)
    local pin1 = pins.get(0)
    local pin2 = pins.get(1)

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


func createProgressPaths(percent) {
    local R = 50
    local angle = 2 * Math.PI * percent / 100

    local v1 = Vector(0, -50)
    local v2 = v1.rotate(angle)

    local p2 = Vector(50, 50) + v2

    local L = (Vector(50, 0) - p2).length()

    local solution = Math.solveQuadratic(0.5, -R, L*L/8)

    local h = 50

    if (solution) {
        local H = 0
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

        childItems.extendList(createNodeIconItems(node))

        if (node.tempData.has('connectors')) {
            childItems.extendList(node.tempData.get('connectors'))
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

        correctiveVector = Vector(0, h * 0.8)

        if (placement == 'top') {
            y = - padding - h
            x = node.w / 2 - w / 2
            correctiveVector = Vector(w * 0.6, 0)
        } else if (placement == 'bottom') {
            y = node.h + padding
            x = node.w / 2 - w / 2
            correctiveVector = Vector(w * 0.6, 0)
        } else if (placement == 'left') {
            x = - padding - w
            y = node.h / 2 - h / 2
        } else if (placement == 'right') {
            x = node.w + padding
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
            direction = if (tries % 2 == 0) { 1 } else { -1 }
            displacement = correctiveVector * tries * direction
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
                newRootNode = decodeTree(item.args.mindMap_EncodedNode, ' | ', ';')

                nodesById = Map()
                newRootNode.traverse((node) => {
                    nodesById.set(node.id, node)
                    node.id = uid()
                })

                traverseItems = (item) => {
                    if (item.args.templated && item.args.templatedId && nodesById.has(item.args.templatedId)) {
                        node = nodesById.get(item.args.templatedId)
                        node.tempData.set('sourceItem', item)
                    }
                    if (item.childItems) {
                        item.childItems.forEach(traverseItems)
                    }
                }
                traverseItems(item)
                newRootNode.attachTo(dstNode)
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
                addingControl('top', 'BL', node.w / 2 - 10, -controlPadding),
                addingControl('bottom', 'TL', node.w / 2 - 10, node.h + controlPadding),
                addingControl('left', 'TR', -controlPadding, node.h / 2 - 10),
                addingControl('right', 'TL', node.w + controlPadding, node.h / 2 - 10)
            ))
        }
    })
}

rootNode = decodeTree(nodes, ' | ', ';')
reindexTree(rootNode)

 if (context.phase == 'build') {
    rootItem = buildTemplateItems(rootNode)
    rootItem.name = 'Mind map'
    rootItem.w = width
    rootItem.h = height
}

