gapRatio = 0.40
nodeWidth = 20

struct Node {
    id: uid()
    name: 'Unnamed'
    value: 0
    inValue: 0
    outValue: 0
    x: 0
    y: 0
    level: 0
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

    nodes.forEach((n, i) => {
        if (i > 0) {
            result += '|'
        }
        result += `${n.id};v=${n.value};x=${n.x};y=${n.y}`
    })
    result
}

func decodeListOfObjects(text, constructorCallback, paramSetterCallback) {
    local nodes = List()
    splitString(text, '|').forEach(singleNodeText => {
        local node = constructorCallback()
        local parts = splitString(singleNodeText, ';')
        for (local i = 0; i < parts.size; i++) {
            if (i == 0) {
                node.id = parts.get(0)
            } else {
                local varValue = splitString(parts.get(i), '=')
                if (varValue.size == 2) {
                    local name = varValue.get(0)
                    local value = varValue.get(1)
                    paramSetterCallback(node, name, value)
                }
            }
        }
        nodes.add(node)
    })
    nodes
}

func decodeNodes(text) {
    decodeListOfObjects(text, () => {
        Node()
    }, (node, name, value) => {
        if (name == 'x') {
            node.x = value
        } else if (name == 'y') {
            node.y = value
        }
    })
}


struct Connection {
    id: uid()
    srcId: ''
    dstId: ''
    value: 0
}

func encodeConnections(connections) {
    local result = ''

    connections.forEach((c, i) => {
        if (i > 0) {
            result += '|'
        }
        result += `${c.id};s=${c.srcId};d=${c.dstId};v=${c.value}`
    })
    result
}

func decodeConnections(text) {
    decodeListOfObjects(text, () => {
        Connection()
    }, (node, name, value) => {
        if (name == 'v') {
            node.value = value
        } else if (name == 's') {
            node.srcId = value
        } else if (name == 'd') {
            node.dstId = value
        }
    })
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
            dstNode.level = node.level + 1
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

                local nodeItem = Item(node.id, node.name, 'rect')
                nodeItem.w = node.width
                nodeItem.h = node.height
                nodeItem.x = node.position
                nodeItem.y = node.offset
                nodeItems.add(nodeItem)

                currentY += nodeItem.h + singleGap
            })
        })
    }
    nodeItems
}

func buildConnectorItems(levels, allConnections) {
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

    levels.forEach(level => {
        level.nodes.forEach(node => {
            local connections = connectionsBySource.get(node.id)
            if (connections) {
                connections.forEach(c => {
                    local dstNode = level.nodesMap.get(c.dstId)
                    if (dstNode) {
                        connectorItems.add(buildSingleConnectorItem(c, node, dstNode))
                    }
                })
            }
        })
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
    local xs = srcNode.position + srcNode.width
    local ys1 = srcNode.offset + srcNode.reservedOut
    local ys2 = ys1 + connectorSize
    srcNode.reservedOut += connectorSize

    local xd = dstNode.position
    local yd1 = dstNode.offset + dstNode.reservedIn
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

    item.shapeProps.set('paths', List(Map(
        'id', 'p-' + connector.id,
        'closed', true,
        'pos', 'relative',
        'points', points
    )))
    item
}

allNodes = decodeNodes(nodes)
allConnections = decodeConnections(connections)

local levels = buildLevels(allNodes, allConnections)

nodeItems = buildNodeItems(levels)
connectorItems = buildConnectorItems(levels, allConnections)
