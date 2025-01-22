gapRatio = 0.25
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
            levels.set(node.level, Level(node.level, List(node)))
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
        local unitSize = maxLevelValue / (height * (1 - gapRatio))
        local singleGap = height * gapRatio / maxNodesPerLevel

        levels.forEach(level => {
            local levelPosition = level.idx * width / levels.size
            local levelSize = level.totalValue * unitSize + singleGap * (level.nodes.size - 1)
            local levelOffset = height / 2 - levelSize / 2

            local currentY = levelOffset
            level.nodes.forEach(node => {
                local nodeItem = Item(node.id, node.name, 'rect')
                nodeItem.w = nodeWidth
                nodeItem.h = unitSize * node.value
                nodeItem.x = levelPosition
                nodeItem.y = currentY
                nodeItems.add(nodeItem)

                currentY += nodeItem.h + singleGap
            })
        })
    }
    nodeItems
}



allNodes = decodeNodes(nodes)
allConnections = decodeConnections(connections)

log('allNodes', allNodes)
log('allConnections', allConnections)
local levels = buildLevels(allNodes, allConnections)

log('allLevels', levels)

nodeItems = buildNodeItems(levels)

log('node items', nodeItems)


// levels.forEach(level => {
//     level.nodes
// })
