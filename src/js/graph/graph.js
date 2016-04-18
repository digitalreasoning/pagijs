var Node = require('./node');
var Edge = require('./edge');
var GraphImpl = require('graphlib').Graph;
var utils = require('../util');
var CONTROL_NODE = require('./constants').CONTROL_NODE;
var deepClone = utils.deepClone;

function Graph(id) {
    this._id = id || null;
    this._version = '2.0';
    this._schemaUris = [];
    this._content = null;
    this._contentType = null;
    this._spanNodeTypes = { };
    this._sequenceNodeTypes = { };
    this._spanContainerNodeTypes = { };
    this._nodeTypes = { };
    this._graphImpl = new GraphImpl({
        directed: true,
        multigraph: true,
        compound: true
    });
}

Graph.prototype.setId = function(id) { this._id = id; };
Graph.prototype.getId = function() { return this._id; };
Graph.prototype.getVersion = function() { return this._version; };

Graph.prototype.addSchemaUri = function(uri) {
    this._schemaUris.push(uri);
};
Graph.prototype.getSchemaUris = function() {
    return this._schemaUris.map(function(schema) { return schema; });
};

Graph.prototype.setContent = function(content) {
    this._content = content;
};
Graph.prototype.getContent = function() {
    return this._content;
};

Graph.prototype.setContentType = function(contentType) {
    this._contentType = contentType;
};
Graph.prototype.getContentType = function() {
    return this._contentType;
};

Graph.prototype.setNodeTypeAsSpan = function(nodeType, attrMap) {
    this._spanNodeTypes[nodeType] = attrMap || { };
};
Graph.prototype.getNodeTypesAsSpan = function() {
    // Don't return a direct reference to the object.
    return deepClone(this._spanNodeTypes);
};

Graph.prototype.setNodeTypeAsSequence = function(nodeType, attrMap) {
    this._sequenceNodeTypes[nodeType] = attrMap || { };
};
Graph.prototype.getNodeTypesAsSequence = function() {
    // Don't return a direct reference to the object.
    return deepClone(this._sequenceNodeTypes);
};

Graph.prototype.setNodeTypeAsSpanContainer = function(nodeType, attrMap) {
    this._spanContainerNodeTypes[nodeType] = attrMap || { };
};
Graph.prototype.getNodeTypesAsSpanContainer = function() {
    // Don't return a direct reference to the object.
    return deepClone(this._spanContainerNodeTypes);
};

// Node manipulation functions
Graph.prototype.nodeExists = function(nodeId) { return this._graphImpl.hasNode(nodeId); };
Graph.prototype.getNodeById = function(nodeId) { return this._graphImpl.node(nodeId); };
Graph.prototype.getNodeTypes = function() { return Object.keys(this._nodeTypes); };
Graph.prototype.getNodesByType = function(nodeType) {
    return this._graphImpl.children(nodeType).map(function(nodeId) {
        return this.getNodeById(nodeId);
    }, this);
};
Graph.prototype.getNodeIds = function() {
    // control nodes have non-int ids, filter them out
    return this._graphImpl.nodes().filter(function(nodeId) {
        return !isNaN(parseInt(nodeId));
    });
};
Graph.prototype.getNodes = function() {
    return this.getNodeIds().map(function(nodeId) {
        return this.getNodeById(nodeId);
    }, this);
};
Graph.prototype.addNode = function(node, connectEdges) {
    if (!(node instanceof Node)) {
        throw Error('Parameter must be an instance of Node when calling Graph.addNode.');
    }
    if (node.getType() === null) {
        throw Error('Adding a node to the graph must have a TYPE.');
    }
    if (this.nodeExists(node.getId())) {
        throw Error('Graph already contains a node with id `' + node.getId() + '`.');
    }
    if (!node.getId()) {
        node.setId(this._generateNodeId());
    }
    // console.log("ADD NODE id: " + node.getId() + ", type: " + node.getType() + ".");
    connectEdges = connectEdges === undefined ? true : connectEdges;
    this._graphImpl.setNode(node.getId(), node);
    node.setGraph(this);
    // Create control node and set child relationship for node type.
    if (!this.nodeExists(node.getType())) {
        this._graphImpl.setNode(node.getType(), CONTROL_NODE);
    }
    this._graphImpl.setParent(node.getId(), node.getType());
    if (connectEdges) { node.connectEdges(); }
};
Graph.prototype.removeNode = function(node) {
    if (!(node instanceof Node)) {
        throw Error('Parameter must be an instance of Node when calling Graph.removeNode.');
    }
    this._nodeTypes[node.getType()] = this._nodeTypes[node.getType()].filter(function(aNode) {
        return aNode.getId() !== node.getId();
    });
    if (this._nodeTypes[node.getType()].length === 0) {
        delete this._nodeTypes[node.getType()];
    }
    node.removeGraph();
    this._graphImpl.removeNode(node.getId());
};
// Edge manipulation functions
Graph.prototype.edgeExists = function(sourceId, targetId, edgeType) {
    return this._graphImpl.hasEdge(sourceId, targetId, edgeType);
};
Graph.prototype.addEdge = function(sourceId, targetId, edgeType, targetType) {
    if (!this.nodeExists(sourceId) || !this.nodeExists(targetId)) {
        return utils.logEdgeError(this, sourceId, targetId, edgeType);
    }
    targetType = targetType || this.getNodeById(targetId).getType();
    var edge = new Edge(sourceId, targetId, targetType, edgeType);

    this._graphImpl.setEdge(sourceId, targetId, edge, edgeType);
}
Graph.prototype.setEdge = function(sourceId, targetId, edgeType, toType) {
    if (!this.hasNode(sourceId) || !this.hasNode(targetId)) {
        return logEdgeTargetError(this, sourceId, targetId, edgeType);
    }

    toType = toType || this.getNodeById(targetId).getType();
    var newEdge = new Edge(sourceId, targetId, toType, edgeType);

    this._graphImpl.setEdge(sourceId, targetId, newEdge, edgeType);
};
Graph.prototype.setEdges = function(edges) {
    edges.forEach(function(edge) {
        this.setEdge(edge.sourceId, edge.targetId, edge.type, edge.toType);
    }, this);
};
Graph.prototype.getEdge = function(sourceId, targetId, edgeType) {
    return this._graphImpl.edge(sourceId, targetId, edgeType);
};
Graph.prototype.removeEdge = function(sourceId, targetId, edgeType) {
    this._graphImpl.removeEdge(sourceId, targetId, edgeType);
};
Graph.prototype.connectEdges = function() {
    // console.log("Graph.connectEdges ------------------------");
    this.getNodes().forEach(function(node) {
        node.connectEdges();
    });
    // console.log("Graph.connectEdges ------------------------");
};
Graph.prototype.inEdges = function(sourceId, targetId) {
    return this._graphImpl.inEdges(sourceId, targetId);
};
Graph.prototype.outEdges = function(sourceId, targetId) {
    return this._graphImpl.outEdges(sourceId, targetId);
};
Graph.prototype.hasEdge = function(sourceId, targetId, type) {
    return this._graphImpl.hasEdge(sourceId, targetId, type);
};
Graph.prototype.hasNode = function(nodeId) { return this._graphImpl.hasNode(nodeId); };
Graph.prototype.getNodeById = function(nodeId) { return this._graphImpl.node(nodeId); };
Graph.prototype.getNodeTypes = function() { return Object.keys(this._nodeTypes); };
Graph.prototype.getNodesByType = function(nodeType) {
    if (this._nodeTypes[nodeType] === undefined) { return []; }
    return this._nodeTypes[nodeType].map(function(node) {
        return node;
    });
};
Graph.prototype.getNodeIds = function() {
    return this._graphImpl.nodes();
};
Graph.prototype.getNodes = function() {
    return this.getNodeIds().map(function(nodeId) {
        return this.getNodeById(nodeId);
    }, this);
};

// Manipulation functions
Graph.prototype.createNode = function(id, type) {
    id = id || this._generateNodeId;
    if (type === undefined || type === null) { throw Error('type is a required param for `createNode`'); }
    var newNode = new Node(id, this, type);
    this.addNode(newNode, false);
    return this.getNodeById(id);
};

// Hidden functions
Graph.prototype._generateNodeId = function() {
    var currentMaxId = this.getNodes().reduce(function getCurrentMaxId(minId, node) {
        var nodeId = parseInt(node.getId());
        var maxId = nodeId > minId ? nodeId : minId;

        return maxId;
    }, 0);

    // Increment the max id by one to get the new id.
    var newMaxId = currentMaxId + 1;
    return newMaxId.toString();
};

module.exports = Graph;
