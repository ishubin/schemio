local gapRatio = nodeSpacing / 100
local labelFontSize = max(1, round(fontSize * (100 - magnify) / 100))
local valueFontSize = max(1, round(fontSize * (100 + magnify) / 100))

local nodesById = Map()

local colorThemes = Map(
    'default', List('#F16161', '#F1A261', '#F1EB61', '#71EB57', '#57EBB1', '#57C2EB', '#576BEB', '#A557EB', '#EB57C8', '#EB578E'),
    'light', List('#FD9999', '#FDCA99', '#F9FD99', '#C2FD99', '#99FDA6', '#99FDE2', '#99EAFD', '#99BEFD', '#AE99FD', '#FD99F6'),
    'dark', List('#921515', '#924E15', '#899215', '#4E9215', '#15922B', '#15926B', '#157F92', '#153F92', '#491592', '#921575'),
    'air-force-blue', List('#5d8aa8'),
    'gray', List('#6B6B64'),
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

struct Connection {
    id: uid()
    srcId: ''
    dstId: ''
    value: 0
    srcNode: null
    dstNode: null
    item: null
}

struct CodeLine {
    text: ''
    connection: null
}

struct Level {
    idx: 0
    nodes: List()
    nodesMap: Map()
    totalValue: 0
    height: 0
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


func encodeNodes(nodes) {
    local result = ''

    nodes.forEach(n => {
        if (result != '') {
            result += '|'
        }
        result += `${n.id};x=${n.x};y=${n.y};c=${n.color}`
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
                    } else if (name == 'c') {
                        node.color = value
                    }
                }
            }
        }
        nodesById.set(node.id, node)
    })
    nodesById
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
    local getOrCreateNode = (id) => {
        local node = nodesById.get(id)
        if (!node) {
            node = Node(id, id)
            nodesById.set(id, node)
        }
        local nData = nodesData.get(id)
        if (nData) {
            node.x = nData.x
            node.y = nData.y
            if (nData.color) {
                node.color = nData.color
            }
        }
        node
    }

    local lines = List()
    splitString(text, '\n').forEach(rawLine => {
        local line = rawLine.trim()
        local c = null
        if (line != '' && !line.startsWith('//')) {
            c = parseConnection(line)
        }
        if (c) {
            c.srcNode = getOrCreateNode(c.srcId)
            c.dstNode = getOrCreateNode(c.dstId)
            lines.add(CodeLine(rawLine, c))
        } else {
            lines.add(CodeLine(rawLine, null))
        }
    })
    lines
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

func readjustStarterNodeLevels(nodesMap) {
    // readjusting node levels for starter nodes
    nodesMap.forEach(node => {
        if (node.srcNodes.size == 0 && node.dstNodes.size > 0) {
            local minDstLevel = node.dstNodes.get(0).level
            node.dstNodes.forEach(dstNode => {
                if (minDstLevel > dstNode.level) {
                    minDstLevel = dstNode.level
                }
            })
            if (minDstLevel - node.level > 1) {
                node.level = minDstLevel - 1
            }
        }
    })
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

    readjustStarterNodeLevels(nodesMap)

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
                if (colorTheme != 'custom') {
                    node.color = colorPalette.get(abs(hashCode) % colorPalette.size)
                }

                local nodeItem = Item('n-' + node.id, node.name, 'rect')
                nodeItem.w = node.width
                nodeItem.h = node.height
                nodeItem.x = node.position + node.x * width
                nodeItem.y = node.offset + node.y * height
                nodeItem.shapeProps.set('strokeSize', nodeStrokeSize)
                nodeItem.shapeProps.set('strokeColor', nodeStrokeColor)
                nodeItem.shapeProps.set('cornerRadius', nodeCornerRadius)

                nodeItem.shapeProps.set('fill', Fill.solid(node.color))

                nodeItem.args.set('tplArea', 'movable')
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
                    a.dstNode.offset + a.dstNode.y * height - (b.dstNode.offset + b.dstNode.y * height)
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
        a.srcNode.offset + a.srcNode.y * height - (b.srcNode.offset + b.srcNode.y * height)
    })

    cs.forEach(c => {
        connectorItems.add(buildSingleConnectorItem(c, c.srcNode, c.dstNode))
    })

    connectorItems
}


func buildSingleConnectorItem(connector, srcNode, dstNode) {
    local item = Item(connector.id, `${srcNode.id} -> ${dstNode.id}`, 'path')
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

    local t = curviness / 100

    local points = List(
        PathPoint('B', xs, ys1, 0, t * (ys2 - ys1) / 2, t * (xd - xs) / 2, 0),
        PathPoint('B', xd, yd1, t * (xs - xd) / 2, 0, 0, t * (yd2 - yd1) / 2),
        PathPoint('B', xd, yd2, 0, t * (yd1 - yd2) / 2, t * (xs - xd) / 2, 0),
        PathPoint('B', xs, ys2, t * (xd - xs) / 2, 0, 0, t * (ys1 - ys2) / 2),
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

    if (conColorType == 'gradient') {
        item.shapeProps.set('fill', Fill.linearGradient(90, 0, srcNode.color, 100, dstNode.color))
    } else if (conColorType == 'source') {
        item.shapeProps.set('fill', Fill.solid(srcNode.color))
    } else if (conColorType == 'destination') {
        item.shapeProps.set('fill', Fill.solid(dstNode.color))
    } else {
        item.shapeProps.set('fill', conColor)
    }
    item.shapeProps.set('strokeSize', 0)
    item.shapeProps.set('strokeColor', conHoverStroke)
    item.shapeProps.set('paths', List(Map(
        'id', 'p-' + connector.id,
        'closed', true,
        'pos', 'relative',
        'points', points
    )))

    if (conLabel) {
        item.childItems.add(buildConnectorLabel(connector, item.w, item.h))
    }
    connector.item = item
    item
}

func buildConnectorLabel(c, connectorWidth, connectorHeight) {
    local valueText = formatValue(c.value)
    local valueTextSize = calculateTextSize(valueText, font, fontSize)
    local valueLabel = buildLabel('cl-' + c.id, valueText, font, fontSize, 'center', 'middle')
    valueLabel.w = valueTextSize.w + 4 + 2 * labelPadding
    valueLabel.h = valueTextSize.h * 1.8 + 2 * labelPadding
    valueLabel.x = connectorWidth/2 - valueLabel.w/2 - labelPadding
    valueLabel.y = connectorHeight/2 - valueLabel.h/2 - labelPadding
    valueLabel.name = 'connector-label-' + c.id
    valueLabel.shapeProps.set('strokeColor', labelStroke)
    valueLabel.args.set('tplText', Map('body', '' + c.value))
    if (showLabelFill) {
        valueLabel.shapeProps.set('fill', labelFill)
        valueLabel.shapeProps.set('strokeColor', labelStroke)
        valueLabel.shapeProps.set('strokeSize', labelStrokeSize)
        valueLabel.shapeProps.set('cornerRadius', labelCornerRadius)
    } else {
        valueLabel.shapeProps.set('fill', Fill.none())
        valueLabel.shapeProps.set('strokeSize', 0)
        valueLabel.shapeProps.set('cornerRadius', 0)
    }
    valueLabel
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

local valueFormaters = Map(
    '1000000.00', (value) => {
        numberToLocaleString(value, 'en-US').replaceAll(',', '')
    },
    '1000000,00', (value) => {
        numberToLocaleString(value, 'de-DE').replaceAll('.', '')
    },
    '1,000,000.00', (value) => {
        numberToLocaleString(value, 'en-US')
    },
    '1.000.000,00', (value) => {
        numberToLocaleString(value, 'de-DE')
    },
    '1 000 000.00', (value) => {
        numberToLocaleString(value, 'fi-FI').replaceAll(',', '.')
    },
    '1 000 000,00', (value) => {
        numberToLocaleString(value, 'fi-FI')
    },
)

func formatValue(value) {
    local valueText = value
    if (valueFormaters.has(numberFormat)) {
        valueText = valueFormaters.get(numberFormat)(value)
    }
    valuePrefix + valueText + valueSuffix
}

func buildNodeLabels(nodes) {
    local labelItems = List()
    nodes.forEach(node => {
        local lines = splitString(node.name, '\\n')
        local textWidth = 0
        local textHeight = 0
        local nodeText = ''
        lines.forEach(line => {
            local textSize = calculateTextSize(line, font, labelFontSize)
            textWidth = max(textWidth, textSize.w)
            textHeight += textSize.h
            nodeText += `<p>${line}</p>`
        })


        local valueText = formatValue(node.value)
        local valueTextSize = calculateTextSize(valueText, font, valueFontSize)
        local totalHeight = if (showNodeValues) { (textHeight + valueTextSize.h)*1.8 + 8 } else { textHeight*1.8 + 8 }
        local isLeft = true
        if (labelPlacement == 'outside') {
            isLeft = ((node.level + 1) / max(1, levels.size) <= 0.5)
        } else {
            isLeft = (node.dstNodes.size == 0)
        }

        local halign = 'right'
        if (!isLeft) {
            halign = 'left'
        }

        local label = buildLabel('ln-' + node.id, nodeText, font, labelFontSize, halign, 'middle')
        label.w = textWidth + 4
        label.h = textHeight * 1.8

        local valueLabel = null
        if (showNodeValues) {
            valueLabel = buildLabel('lv-' + node.id, valueText, font, valueFontSize, halign, 'middle')
            valueLabel.w = valueTextSize.w + 4
            valueLabel.h = valueTextSize.h * 1.8
        }

        if (node.srcNodes.size + node.dstNodes.size == 1) {
            valueLabel.args.set('tplText', Map('body', '' + node.value))
        } else {
            valueLabel.args.set('tplText', Map('body', '<p>Cannot edit value</p><p>Too many connections</p>'))
        }

        if (showLabelFill) {
            local rect = Item('lc-'+node.id, 'Label ' + node.id, 'rect')
            if (valueLabel) {
                rect.w = max(label.w, valueLabel.w) + 2 * labelPadding
                rect.h = label.h + valueLabel.h + 2 * labelPadding
            } else {
                rect.w = label.w + 2 * labelPadding
                rect.h = label.h + 2 * labelPadding
            }
            if (isLeft) {
                rect.x = node.position + node.x * width - rect.w - labelPadding
            } else {
                rect.x = node.position + node.width + labelPadding + node.x * width
            }
            rect.shapeProps.set('fill', labelFill)
            rect.shapeProps.set('strokeColor', labelStroke)
            rect.shapeProps.set('strokeSize', labelStrokeSize)
            rect.shapeProps.set('cornerRadius', labelCornerRadius)
            rect.y = node.offset + node.y * height + node.height / 2  - totalHeight / 2
            label.x = labelPadding
            label.y = labelPadding
            rect.childItems.add(label)

            if (valueLabel) {
                valueLabel.x = labelPadding
                valueLabel.y = label.y + label.h
                rect.childItems.add(valueLabel)
            }
            labelItems.add(rect)
        } else {
            if (isLeft) {
                label.x = node.position - label.w - labelPadding
                if (valueLabel) {
                    valueLabel.x = node.position - valueLabel.w - labelPadding
                }
            } else {
                label.x = node.position + node.width + labelPadding
                if (valueLabel) {
                    valueLabel.x = node.position + node.width + labelPadding
                }
            }
            label.x += node.x * width
            label.y = node.offset + node.y * height + node.height / 2  - totalHeight / 2
            labelItems.add(label)

            if (valueLabel) {
                valueLabel.x += node.x * width
                valueLabel.y = label.y + label.h
                labelItems.add(valueLabel)
            }
        }
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

        if (abs(node.x*width) < 7) {
            node.x = 0
        }

        nodesData = encodeNodes(nodesById)
    }
}


func onConnectionValueInput(connectionId, value) {
    allConnections.forEach(c => {
        if (c.id == connectionId) {
            c.value = value
        }
    })
    diagramCode = encodeDiagram()
}


func encodeDiagram() {
    local code = ''
    codeLines.forEach((line, idx) => {
        if (idx > 0) {
            code += '\n'
        }
        if (line.connection) {
            code += line.connection.srcId + ' [' + line.connection.value + '] ' + line.connection.dstId
        } else {
            code += line.text
        }
    })

    code
}


func onTextUpdate(itemId, item, text) {
    if (itemId.startsWith('ln-')) {
        text = stripHTML(text.replaceAll('</p>', '</p>\n')).trim().replaceAll('\n', '\\n')
        local oldNodeId = itemId.substring(3)
        local newNodeId = text

        local foundClashingId = false

        for (local i = 0; i < allConnections.size && !foundClashingId; i++) {
            local c = allConnections.get(i)
            if (c.srcId == newNodeId && c.dstId == newNodeId) {
                foundClashingId = true
            }
        }

        if (!foundClashingId) {
            allConnections.forEach(c => {
                if (c.srcId == oldNodeId) {
                    c.srcId = newNodeId
                    c.srcNode.id = newNodeId
                }
                if (c.dstId == oldNodeId) {
                    c.dstId = newNodeId
                    c.dstNode.id = newNodeId
                }
            })
        }

        diagramCode = encodeDiagram()
    } else if (itemId.startsWith('cl-')) {
        text = stripHTML(text).replaceAll('\n', '').trim()
        local value = parseFloat(text)
        local connectionId = itemId.substring(3)
        local line = codeLines.find(line => { line.connection && line.connection.id == connectionId})
        if (line) {
            line.connection.value = value
            diagramCode = encodeDiagram()
        }
    } else if (itemId.startsWith('lv-')) {
        local nodeId = itemId.substring(3)
        local changes = 0
        text = stripHTML(text).replaceAll('\n', '').trim()
        codeLines.forEach(line => {
            if (line.connection && (line.connection.srcId == nodeId || line.connection.dstId == nodeId)) {
                changes += 1
                line.connection.value = parseFloat(text)
            }
        })

        if (changes == 1) {
            diagramCode = encodeDiagram()
        }
    }
}


func onDeleteItem(itemId, item) {
    local nodeId = null
    local connectionId = null

    if (itemId.startsWith('n-')) {
        nodeId = itemId.substring(2)
    } else if (itemId.startsWith('c-')) {
        connectionId = itemId.substring(2)
    }

    if (nodeId) {
        local node = allNodes.find(node => {node.id == nodeId})
        if (node && node.level == levels.size - 1) {
            if (levels.size > 2 && levels.get(node.level).nodes.size == 1) {
                width -= max(1, width - nodeWidth) / max(1, (levels.size - 1))
            }
        }
    }

    if (connectionId || nodeId) {
        for (local i = codeLines.size - 1; i >= 0; i--) {
            local line = codeLines.get(i)
            if (line.connection) {
                if (connectionId && line.connection.id == connectionId) {
                    codeLines.remove(i)
                } else if (nodeId && (line.connection.srcId == nodeId || line.connection.dstId == nodeId)) {
                    codeLines.remove(i)
                }
            }
        }
        if (codeLines.filter(line => {line.connection}).size > 0) {
            diagramCode = encodeDiagram()
        }
    }
}


func provideOptionsForDstNode(nodeId) {
    local options = List('-- Create new node --')

    local node = allNodes.find(n => {n.id == nodeId})
    if (node) {
        allNodes.forEach(anotherNode => {
            if (anotherNode.level > node.level) {
                options.add(anotherNode.id)
            }
        })
    }
    options
}

func provideOptionsForSrcNode(nodeId) {
    local options = List('-- Create new node --')

    local node = allNodes.find(n => {n.id == nodeId})
    if (node) {
        allNodes.forEach(anotherNode => {
            if (anotherNode.level < node.level) {
                options.add(anotherNode.id)
            }
        })
    }
    options
}

func generateNodeControls(nodes) {
    local controls = List()
    nodes.forEach(node => {
        if (node.level == levels.size - 1) {
            controls.add(Control(
                "+",
                Map(
                    'nodeId', node.id
                ),
                "addDstNodeForNode(control.data.nodeId)",
                node.position + node.x * width + node.width + 20,
                node.offset + node.y * height + node.height / 2 - 10,
                20, 20,
                '+',
                'TL',
                'n-' + node.id,
                'button'
            ))
        } else {
            local control = Control(
                "+",
                Map(
                    'nodeId', node.id
                ),
                "addDstConnection(control.data.nodeId, option)",
                node.position + node.x * width + node.width + 20,
                node.offset + node.y * height + node.height / 2 - 10,
                20, 20,
                '+',
                'TL',
                'n-' + node.id,
                'choice'
            )

            control.optionsProvider = `provideOptionsForDstNode(control.data.nodeId)`
            controls.add(control)
        }

        if (node.level > 0) {
            local control = Control(
                "+",
                Map(
                    'nodeId', node.id
                ),
                "addSrcConnection(control.data.nodeId, option)",
                node.position + node.x * width - 20,
                node.offset + node.y * height + node.height / 2 - 10,
                20, 20,
                '+',
                'TR',
                'n-' + node.id,
                'choice'
            )

            control.optionsProvider = `provideOptionsForSrcNode(control.data.nodeId)`
            controls.add(control)
        }
    })
    controls
}

func addDstConnection(nodeId, option) {
    if (option == '-- Create new node --') {
        addDstNodeForNode(nodeId)
    } else {
        local srcNode = allNodes.find(node => {node.id == nodeId})
        local dstNode = allNodes.find(node => {node.id == option})
        if (srcNode && dstNode) {
            local value = srcNode.value
            if (srcNode.value - srcNode.outValue > 0) {
                value = srcNode.value - srcNode.outValue
            }
            codeLines.add(CodeLine(`${srcNode.id} [${value}] ${dstNode.id}`, null))
            diagramCode = encodeDiagram()
        }
    }
}

func addSrcConnection(nodeId, option) {
    if (option == '-- Create new node --') {
        addSrcNodeForNode(nodeId)
    } else {
        local srcNode = allNodes.find(node => {node.id == option})
        local dstNode = allNodes.find(node => {node.id == nodeId})
        if (srcNode && dstNode) {
            local value = srcNode.value
            if (srcNode.value - srcNode.outValue > 0) {
                value = srcNode.value - srcNode.outValue
            }
            codeLines.add(CodeLine(`${srcNode.id} [${value}] ${dstNode.id}`, null))
            diagramCode = encodeDiagram()
        }
    }
}



func addDstNodeForNode(nodeId) {
    addNewNodeForNode(nodeId, true)
}

func addSrcNodeForNode(nodeId) {
    addNewNodeForNode(nodeId, false)
}

func addNewNodeForNode(nodeId, isDst) {
    local allNodeIds = Set()
    local selectedNode = null

    allNodes.forEach(node => {
        allNodeIds.add(node.id)
        if (node.id == nodeId) {
            selectedNode = node
        }
    })
    if (selectedNode) {
        local idx = 2
        local foundUniqueId = false
        local newId = null
        while(!foundUniqueId && idx < 1000) {
            newId = selectedNode.id + ' ' + idx
            if (!allNodeIds.has(newId)) {
                foundUniqueId = true
            }
            idx += 1
        }
        if (foundUniqueId) {
            if (isDst) {
                codeLines.add(CodeLine(`${selectedNode.id} [${selectedNode.value}] ${newId}`, null))
            } else {
                codeLines.add(CodeLine(`${newId} [${selectedNode.value}] ${selectedNode.id}`, null))
            }
            diagramCode = encodeDiagram()
            if (selectedNode.level == levels.size - 1) {
                width += max(1, width - nodeWidth) / max(1, (levels.size - 1))
            }
        }
    }
}

func onShapePropsUpdate(itemId, item, name, value) {
    if (itemId.startsWith('n-') && name == 'fill' && value.type == 'solid') {
        local nodeId = itemId.substring(2)
        local node = allNodes.find(n => { n.id == nodeId })
        if (node) {
            node.color = value.color
            nodesData = encodeNodes(nodesById)
        }
    }
}


local nodesDataById = decodeNodesData(nodesData)

local codeLines = parseConnections(diagramCode, nodesDataById)
local allConnections = codeLines.filter(cl => { cl.connection != null }).map(cl => { cl.connection })
local allNodes = extractNodesFromConnections(allConnections)

local levels = buildLevels(allNodes, allConnections)

local nodeItems = buildNodeItems(levels)
local connectorItems = buildConnectorItems(levels, allConnections, allNodes)
local nodeLabels = buildNodeLabels(allNodes)

local nodeControls = generateNodeControls(allNodes)