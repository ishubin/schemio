gapRatio = 0.4
nodeWidth = 20
labelPadding = 5

labelFontSize = max(1, round(fontSize * (100 - magnify) / 100))
valueFontSize = max(1, round(fontSize * (100 + magnify) / 100))

local nodesById = Map()

colorThemes = Map(
    'default', List('#F16161', '#F1A261', '#F1EB61', '#71EB57', '#57EBB1', '#57C2EB', '#576BEB', '#A557EB', '#EB57C8', '#EB578E'),
    'light', List('#FD9999', '#FDCA99', '#F9FD99', '#C2FD99', '#99FDA6', '#99FDE2', '#99EAFD', '#99BEFD', '#AE99FD', '#FD99F6'),
    'dark', List('#921515', '#924E15', '#899215', '#4E9215', '#15922B', '#15926B', '#157F92', '#153F92', '#491592', '#921575')
)

struct Node {
    id: uid()
    name: 'Unnamed'
    value: 0
    inValue: 0
    outValue: 0
    color: '#FD9999'
    x: 0
    y: 0
    level: 0
    sortOrder: 0 // Position inside of its level
    srcNodes: List()
    dstNodes: List()
    width: 0
    height: 0
    position: 0
    offset: 0
    unitSize: 1
    reservedIn: 0
    reservedOut: 0
}

func encodeNodes(nodes) {
    local result = ''

    nodes.forEach(n => {
        if (result != '') {
            result += '|'
        }
        result += `${n.id};x=${n.x};y=${n.y}`
    })
    result
}

func decodeNodesData(text) {
    local nodesById = Map()
    splitString(text, '|').forEach(singleNodeText => {
        local node = Node()
        local parts = splitString(singleNodeText, ';')
        for (local i = 0; i < parts.size; i++) {
            if (i == 0) {
                node.id = parts.get(0)
            } else {
                local varValue = splitString(parts.get(i), '=')
                if (varValue.size == 2) {
                    local name = varValue.get(0)
                    local value = varValue.get(1)
                    if (name == 'x') {
                        node.x = value
                    } else if (name == 'y') {
                        node.y = value
                    }
                }
            }
        }
        nodesById.set(node.id, node)
    })
    nodesById
}


struct Connection {
    id: uid()
    srcId: ''
    dstId: ''
    value: 0
    srcNode: null
    dstNode: null
}


func parseConnection(line) {
    local s1 = line.indexOf('[')
    local s2 = line.indexOf(']')

    if (s1 > 0 && s2 > s1) {
        local nodeName1 = line.substring(0, s1).trim()
        local nodeName2 = line.substring(s2+1).trim()
        local valueText = line.substring(s1+1, s2)

        if (nodeName1 != '' && nodeName2 != '') {
            local value = parseFloat(valueText)
            local id = nodeName1 + '[]' + nodeName2
            Connection(id, nodeName1, nodeName2, value)
        } else {
            null
        }
    } else {
        null
    }
}

func parseConnections(text, nodesData) {
    getOrCreateNode = (id) => {
        local node = nodesById.get(id)
        if (!node) {
            node = Node(id, id)
            nodesById.set(id, node)
        }
        local nData = nodesData.get(id)
        if (nData) {
            node.x = nData.x
            node.y = nData.y
        }
        node
    }

    local connections = List()
    splitString(text, '\n').forEach(line => {
        line = line.trim()
        if (line != '' && !line.startsWith('//')) {
            local c = parseConnection(line)
            if (c) {
                c.srcNode = getOrCreateNode(c.srcId)
                c.dstNode = getOrCreateNode(c.dstId)
                if (c) {
                    connections.add(c)
                }
            }
        }
    })
    connections
}

func extractNodesFromConnections(connections) {
    local nodeIds = Set()
    local list = List()

    connections.forEach(c => {
        if (!nodeIds.has(c.srcNode.id)) {
            nodeIds.add(c.srcNode.id)
            list.add(c.srcNode)
        }
        if (!nodeIds.has(c.dstNode.id)) {
            nodeIds.add(c.dstNode.id)
            list.add(c.dstNode)
        }
    })

    list
}



// Performs a recursive tree iteration and updates the levels in nodes
// maxVisitCount is used in order to prevent from infinite loop in case there is a cyclic dependency
func updateLevels(node, maxVisitCount) {
    if (maxVisitCount >= 0) {
        node.dstNodes.forEach(dstNode => {
            local newLevel = node.level + 1
            if (dstNode.level < newLevel) {
                dstNode.level = newLevel
                updateLevels(dstNode, maxVisitCount - 1)
            }
        })
    }
}

struct Level {
    idx: 0
    nodes: List()
    nodesMap: Map()
    totalValue: 0
    height: 0
}

func buildLevels(allNodes, allConnections) {
    local nodesMap = Map()
    allNodes.forEach(node => {
        nodesMap.set(node.id, node)
    })

    allConnections.forEach(c => {
        if (c.srcId != c.dstId) {
            local srcNode = nodesMap.get(c.srcId)
            if (!srcNode) {
                srcNode = Node(c.srcId)
                nodesMap.set(c.srcId, srcNode)
            }
            local dstNode = nodesMap.get(c.dstId)
            if (!dstNode) {
                dstNode = Node(c.dstId)
                nodesMap.set(c.dstId, dstNode)
            }

            local value = abs(c.value)
            srcNode.outValue += value
            dstNode.inValue += value
            srcNode.dstNodes.add(dstNode)
            dstNode.srcNodes.add(srcNode)
        }
    })

    nodesMap.forEach(node => {
        if (node.srcNodes.size == 0) {
            node.level = 0
            updateLevels(node, nodesMap.size)
        }
    })

    local levels = Map()
    local maxLevel = 0
    nodesMap.forEach(node => {
        node.value = max(node.inValue, node.outValue)
        local level = levels.get(node.level)
        if (level) {
            level.nodes.add(node)
        } else {
            levels.set(node.level, Level(node.level, List(node), nodesMap))
        }
        if (maxLevel < node.level) {
            maxLevel = node.level
        }
    })

    local allLevels = List()
    for (local i = 0; i <= maxLevel; i++) {
        local level = levels.get(i)
        if (level) {
            level.nodes.sort((a, b) => {
                b.value - a.value
            })
            level.nodes.forEach((n, idx) => {
                n.sortOrder = idx
            })
            allLevels.add(level)
            level.totalValue = 0
            level.nodes.forEach(node => {
                level.totalValue += node.value
            })
        }
    }

    allLevels
}


func buildNodeItems(levels) {
    local colorPalette = colorThemes.get(colorTheme)
    if (!colorPalette) {
        colorPalette = colorThemes.get('default')
    }

    local maxLevelValue = 0
    local maxNodesPerLevel = 0
    levels.forEach(level => {
        if (maxLevelValue < level.totalValue) {
            maxLevelValue = level.totalValue
        }
        if (maxNodesPerLevel < level.nodes.size) {
            maxNodesPerLevel = level.nodes.size
        }
    })

    local nodeItems = List()

    if (maxLevelValue > 0 && maxNodesPerLevel > 0) {
        local unitSize = height * (1 - gapRatio) / maxLevelValue
        local singleGap = height * gapRatio / maxNodesPerLevel

        levels.forEach(level => {
            local levelPosition = level.idx * max(1, width - nodeWidth) / (levels.size - 1)
            local levelSize = level.totalValue * unitSize + singleGap * (level.nodes.size - 1)
            local levelOffset = height / 2 - levelSize / 2

            local currentY = levelOffset
            level.nodes.forEach(node => {
                node.unitSize = unitSize
                node.height = unitSize * node.value
                node.width = nodeWidth
                node.position = levelPosition
                node.offset = currentY
                local hashCode = Strings.hashCode(node.name)
                node.color = colorPalette.get(abs(hashCode) % colorPalette.size)


                local nodeItem = Item('n-' + node.id, node.name, 'rect')
                nodeItem.w = node.width
                nodeItem.h = node.height
                nodeItem.x = node.position + node.x * width
                nodeItem.y = node.offset + node.y * height
                nodeItem.shapeProps.set('strokeSize', 1)
                nodeItem.shapeProps.set('strokeColor', '#ffffff')
                nodeItem.shapeProps.set('cornerRadius', 2)
                nodeItem.shapeProps.set('fill', Fill.solid(node.color))
                nodeItem.args.set('tplArea', 'controlled')
                nodeItem.args.set('tplConnector', 'off')
                nodeItem.args.set('tplRotation', 'off')
                nodeItem.locked = false
                nodeItems.add(nodeItem)

                currentY += nodeItem.h + singleGap
            })
        })
    }
    nodeItems
}

func buildConnectorItems(levels, allConnections, allNodes) {
    local k2 = max(allConnections.size, allNodes.size)
    local k1 = k2 ^ 2
    local connectorItems = List()
    local connectionsBySource = Map()
    allConnections.forEach(c => {
        if (c.srcId != c.dstId) {
            local cs = connectionsBySource.get(c.srcId)
            if (cs) {
                cs.add(c)
            } else {
                connectionsBySource.set(c.srcId, List(c))
            }
        }
    })

    local cs = List()

    levels.forEach(level => {
        level.nodes.forEach(node => {
            local connections = connectionsBySource.get(node.id)
            if (connections) {
                connections.sort((a, b) => {
                    a.dstNode.level * k1 + a.dstNode.sortOrder * k2 - (b.dstNode.level * k1 + b.dstNode.sortOrder * k2)
                })
                connections.forEach(c => {
                    local dstNode = level.nodesMap.get(c.dstId)
                    if (dstNode) {
                        cs.add(c)
                    }
                })
            }
        })
    })

    cs.sort((a, b) => {
        a.srcNode.offset - b.srcNode.offset
    })

    cs.forEach(c => {
        connectorItems.add(buildSingleConnectorItem(c, c.srcNode, c.dstNode))
    })

    connectorItems
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

func buildSingleConnectorItem(connector, srcNode, dstNode) {
    local item = Item(connector.id, 'Connection', 'path')
    local connectorSize = srcNode.unitSize * connector.value

    local xs = srcNode.position + srcNode.x * width + srcNode.width
    local ys1 = srcNode.offset + srcNode.y * height + srcNode.reservedOut
    local ys2 = ys1 + connectorSize
    srcNode.reservedOut += connectorSize

    local xd = dstNode.position + dstNode.x * width
    local yd1 = dstNode.offset + dstNode.y * height + dstNode.reservedIn
    local yd2 = yd1 + connectorSize
    dstNode.reservedIn += connectorSize

    local minX = min(xs, xd)
    local maxX = max(xs, xd)
    local minY = min(ys1, ys2, yd1, yd2)
    local maxY = max(ys1, ys2, yd1, yd2)

    local dx = max(0.001, maxX - minX)
    local dy = max(0.001, maxY - minY)

    local points = List(
        PathPoint('B', xs, ys1, 0, (ys2 - ys1) / 3, (xd - xs) / 3, 0),
        PathPoint('B', xd, yd1, (xs - xd) / 3, 0, 0, (yd2 - yd1) / 3),
        PathPoint('B', xd, yd2, 0, (yd1 - yd2) / 3, (xs - xd) / 3, 0),
        PathPoint('B', xs, ys2, (xd - xs) / 3, 0, 0, (ys1 - ys2) / 3),
    ).map(p => {
        PathPoint('B',
            100 * (p.x - minX) / dx, 100 * (p.y - minY) / dy,
            100 * p.x1 / dx, 100 * p.y1 / dy,
            100 * p.x2 / dx, 100 * p.y2 / dy
        )
    })

    item.x = minX
    item.y = minY
    item.w = dx
    item.h = dy

    if (connectorColorType == 'gradient') {
        item.shapeProps.set('fill', Fill.linearGradient(90, 0, srcNode.color, 100, dstNode.color))
    } else if (connectorColorType == 'source') {
        item.shapeProps.set('fill', Fill.solid(srcNode.color))
    } else if (connectorColorType == 'destination') {
        item.shapeProps.set('fill', Fill.solid(dstNode.color))
    } else {
        item.shapeProps.set('fill', Fill.solid(connectorColor))
    }
    item.shapeProps.set('strokeSize', 0)
    item.shapeProps.set('paths', List(Map(
        'id', 'p-' + connector.id,
        'closed', true,
        'pos', 'relative',
        'points', points
    )))
    item
}

func buildLabel(id, text, font, fontSize, halign, valign) {
    local item = Item(id, text, 'none')
    item.args.set('templateForceText', true)
    item.textSlots.set('body', Map(
        'text', text,
        'font', font,
        'color', labelColor,
        'fontSize', fontSize,
        'halign', halign,
        'valign', valign,
        'paddingLeft', 0,
        'paddingRight', 0,
        'paddingTop', 0,
        'paddingBottom', 0,
        'whiteSpace', 'nowrap'
    ))
    item
}

func buildNodeLabels(nodes) {
    local labelItems = List()
    nodes.forEach(node => {
        local textSize = calculateTextSize(node.name, font, labelFontSize)
        local valueTextSize = calculateTextSize('' + node.value, font, valueFontSize)
        local totalHeight = (textSize.h + valueTextSize.h)*1.8 + 8
        local isLeft = node.dstNodes.size == 0
        local halign = 'left'
        if (!isLeft) {
            halign = 'right'
        }
        local item = buildLabel('ln-' + node.id, node.name, font, labelFontSize, halign, 'bottom')
        item.w = textSize.w + 4
        item.h = textSize.h * 1.8 + 4

        if (isLeft) {
            item.x = node.position - item.w - labelPadding
        } else {
            item.x = node.position + node.width + labelPadding
        }
        item.x += node.x * width
        item.y = node.offset + node.y * height + node.height / 2  - totalHeight / 2

        labelItems.add(item)

        local valueLabel = buildLabel('lv-' + node.id, '' + node.value, font, valueFontSize, halign, 'top')
        valueLabel.w = valueTextSize.w + 4
        valueLabel.h = valueTextSize.h * 1.8 + 4
        if (isLeft) {
            valueLabel.x = node.position - valueLabel.w - labelPadding
        } else {
            valueLabel.x = node.position + node.width + labelPadding
        }
        valueLabel.x += node.x * width
        valueLabel.y = item.y + item.h

        labelItems.add(valueLabel)
    })
    labelItems
}


func onAreaUpdate(itemId, item, area) {
    local node = null
    if (itemId.startsWith('n-')) {
        node = nodesById.get(itemId.substring(2))
    }
    if (node) {
        node.x = (area.x - node.position) / max(1, width)
        node.y = (area.y - node.offset) / max(1, height)

        nodesData = encodeNodes(nodesById)
    }
}

local nodesDataById = decodeNodesData(nodesData)
allConnections = parseConnections(diagramCode, nodesDataById)
allNodes = extractNodesFromConnections(allConnections)

local levels = buildLevels(allNodes, allConnections)

nodeItems = buildNodeItems(levels)
connectorItems = buildConnectorItems(levels, allConnections, allNodes)
nodeLabels = buildNodeLabels(allNodes)
