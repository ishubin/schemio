struct Connector {
    id: ''
    srcId: ''
    dstId: ''
    p1: Vector(0, 0)
    p2: Vector(0, 0)
    x: 0
    y: 0
    w: 0
    h: 0

    updateArea() {
        this.x = min(this.p1.x, this.p2.x)
        this.y = min(this.p1.y, this.p2.y)
        this.w = abs(this.p1.x - this.p2.x)
        this.h = abs(this.p1.y - this.p2.y)
    }
}

reindexTree = () => {
    rootNode.reindex((node) => {
        local fullWidth = 0
        if (node.children.size > 0) {
            node.children.forEach((childNode) => {
                fullWidth += childNode.data.get('fullWidth')
            })
            fullWidth = fullWidth + (node.children.size - 1) * hGap
        } else {
            fullWidth = width
        }
        node.data.set('fullWidth', fullWidth)
    })
}


local items = List()
local rootNode = decodeTree(nodes, ',', ':')
reindexTree()

local connectors = List()

local nodesById = Map()

func visitTree(node, parent) {
    nodesById.set(node.id, node)

    if (!parent) {
        node.x = 0
        node.y = 0
    } else {
        node.y = node.level * (height + vGap)
    }
    items.add(node)

    local axis = node.x + width/2
    local childOffset = axis - node.data.get('fullWidth')/2
    node.children.forEach((childNode) => {
        local childFullWidth = childNode.data.get('fullWidth')
        childNode.x = childOffset + (childFullWidth - width)/2
        childOffset = childNode.x + (width + childFullWidth)/2 + hGap
        visitTree(childNode, node)

        local connector = Connector(`connector_${node.id}_${childNode.id}`, node.id, childNode.id)
        connector.p1 = Vector(node.x + width/2, node.y + height)
        connector.p2 = Vector(childNode.x + width/2, childNode.y)
        connector.updateArea()
        connectors.add(connector)
    })
}

visitTree(rootNode, 0, null)

func createNewChildFor(nodeId) {
    local node = nodesById.get(nodeId)
    if (node) {
        TreeNode(uid()).attachTo(node)
        reindexTree()
    }
    nodes = rootNode.encodeTree(',', ':')
}

func createNewSiblingFor(nodeId, idx) {
    local node = nodesById.get(nodeId)
    if (node && node.parent) {
        node.parent.attachChildAtIndex(TreeNode(uid()), idx)
        reindexTree()
    }
    nodes = rootNode.encodeTree(',', ':')
}

func onDeleteItem(itemId, item) {
    local node = nodesById.get(itemId)
    if (node && node.parent) {
        node.parent.children.remove(node.siblingIdx)
        reindexTree()
    }
    nodes = rootNode.encodeTree(',', ':')
}
