struct TreeNode {
    id: uid()
    data: Map()
    parent: null
    x: 0
    y: 0
    w: 0
    h: 0
    siblingIdx: 0
    level: 0
    children: List()
    tempData: Map()

    findById(nodeId) {
        if (this.id == nodeId) {
            this
        } else {
            local foundNode = null
            for (i = 0; i < this.children.size && !foundNode; i++) {
                foundNode = this.children.get(i).findById(nodeId)
            }
            foundNode
        }
    }

    map(callback) {
        local mappedChildren = List()
        this.children.forEach((childNode) => {
            mappedChildren.add(childNode.map(callback))
        })
        callback(this, mappedChildren)
    }

    attachTo(parentNode) {
        this.parent = parentNode
        this.siblingIdx = parentNode.children.size
        parentNode.children.add(this)
    }

    attachChildAtIndex(childNode, idx) {
        childNode.parent = this
        this.children.insert(idx, childNode)
        this.children.forEach((node, nodeIdx) => {
            node.siblingIdx = nodeIdx
        })
    }

    encodeTree(nodeSeparator, paramSeparator) {
        local encoded = this.id
        this.data.forEach((value, name) => {
            encoded = encoded + paramSeparator + name + '=' + value
        })
        this.children.forEach((childNode) => {
            childEncoded = childNode.encodeTree(nodeSeparator, paramSeparator)
            encoded += nodeSeparator + childEncoded
        })
        encoded + nodeSeparator + 'N'
    }

    reindex(callback) {
        this.level = if (this.parent) { this.parent.level + 1 } else { 0 }
        if (this.children.size > 0) {
            this.children.forEach((childNode) => {
                childNode.reindex(callback)
            })
        }
        if (callback) {
            callback(this)
        }
    }

    traverse(callback) {
        callback(this, this.parent)
        this.children.forEach((childNode) => {
            childNode.traverse(callback)
        })
    }
}

func decodeTreeNode(nodeEncoded, paramSeparator) {
    local nodeParts = splitString(nodeEncoded, paramSeparator)
    local nodeId = nodeParts.shift()
    local nodeData = Map()

    nodeParts.forEach((encodedParameter) => {
        paramParts = splitString(encodedParameter, '=')
        if (paramParts.size == 2) {
            nodeData.set(paramParts.get(0), paramParts.get(1))
        }
    })

    TreeNode(nodeId, nodeData)
}

func decodeTree(encodedText, nodeSeparator, paramSeparator) {
    local nodeList = splitString(encodedText, nodeSeparator)
    local rootNode = decodeTreeNode(nodeList.shift(), paramSeparator)
    local currentNode = rootNode
    while(nodeList.size > 0) {
        nodeEncoded = nodeList.shift()
        if (nodeEncoded == 'N') {
            parent = currentNode.parent
            if (!parent) {
                parent = rootNode
            }
            currentNode = parent
        } else {
            newNode = decodeTreeNode(nodeEncoded, paramSeparator)
            newNode.attachTo(currentNode)
            currentNode = newNode
        }
    }
    rootNode
}
