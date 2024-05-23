import { List } from "./list";

export class TreeNode {
    constructor(id, data, parent) {
        this.id = id;
        this.data = data ? data : new Map();
        this.parent = parent;
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
        this.tempData = new Map();
        this.siblingIx = 0;
        this.level = 0;
        this.children = new List();
    }

    findById(nodeId) {
        if (this.id == nodeId) {
            return this;
        } else {
            for (let i = 0; i < this.children.size; i++) {
                const node = this.children.get(i).findById(nodeId);
                if (node) {
                    return node;
                }
            }
        }
        return null;
    }

    map(callback) {
        const mappedChildren = new List();
        this.children.forEach((childNode) => {
            mappedChildren.add(childNode.map(callback));
        });
        return callback(this, mappedChildren);
    }

    /**
     *
     * @param {TreeNode} parentNode
     */
    attachTo(parentNode) {
        this.parent = parentNode;
        this.siblingIdx = parentNode.children.size;
        parentNode.children.add(this);
    }

    /**
     * @param {TreeNode} childNode
     * @param {Number} idx
     */
    attachChildAtIndex(childNode, idx) {
        childNode.parent = this;
        this.children.insert(idx, childNode);
        this.children.forEach((node, nodeIdx) => {
            node.siblingIdx = nodeIdx;
        });
    }

    encodeTree(nodeSeparator, paramSeparator) {
        let encoded = this.id;
        this.data.forEach((value, name) => {
            encoded = encoded + paramSeparator + name + '=' + value;
        });
        this.children.forEach((childNode) => {
            const childEncoded = childNode.encodeTree(nodeSeparator, paramSeparator);
            encoded += nodeSeparator + childEncoded;
        })
        return encoded + nodeSeparator + 'N';
    }

    reindex(callback) {
        this.level = this.parent ? this.parent.level + 1 : 0;
        if (this.children.size > 0) {
            this.children.forEach((childNode) => {
                childNode.reindex(callback);
            });
        }
        if (callback) {
            callback(this);
        }
    }

    traverse(callback) {
        callback(this, this.parent);
        this.children.forEach((childNode) => {
            childNode.traverse(callback);
        });
    }
}



/**
 * @param {String} nodeEncoded
 * @param {String} paramSeparator
 * @returns {TreeNode}
 */
function decodeTreeNode(nodeEncoded, paramSeparator) {
    const nodeParts = nodeEncoded.split(paramSeparator);
    const nodeId = nodeParts.shift();
    const nodeData = new Map();

    nodeParts.forEach((encodedParameter) => {
        const paramParts = encodedParameter.split('=');
        if (paramParts.length === 2) {
            nodeData.set(paramParts[0], paramParts[1]);
        }
    });

    return new TreeNode(nodeId, nodeData);
}

/**
 * @param {String} encodedText
 * @param {String} nodeSeparator
 * @param {String} paramSeparator
 */
export function decodeTree(encodedText, nodeSeparator, paramSeparator) {
    const nodeList = encodedText.split(nodeSeparator);
    const rootNode = decodeTreeNode(nodeList.shift(), paramSeparator);
    let currentNode = rootNode;

    while(nodeList.length > 0) {
        const nodeEncoded = nodeList.shift();
        if (nodeEncoded === 'N') {
            let parent = currentNode.parent;
            if (!parent) {
                parent = rootNode;
            }
            currentNode = parent;
        } else {
            const newNode = decodeTreeNode(nodeEncoded, paramSeparator);
            newNode.attachTo(currentNode);
            currentNode = newNode;
        }
    }
    return rootNode;
}
