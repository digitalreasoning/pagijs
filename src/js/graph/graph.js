'use strict';

var Node = require('./node');
var Edge = require('./edge');
var GraphImpl = require('graphlib').Graph;
var utils = require('../util');
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
        multigraph: true
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
Graph.prototype.getNodeIds = function() {
    return this._graphImpl.nodes();
};
Graph.prototype.getNodes = function() {
    return this.getNodeIds().map(function(nodeId) {
        return this.getNodeById(nodeId);
    }, this);
};
Graph.prototype.nodeExists = function(nodeId) { return this._graphImpl.hasNode(nodeId); };
Graph.prototype.getNodeById = function(nodeId) { return this._graphImpl.node(nodeId); };
Graph.prototype.getNodeTypes = function() { return Object.keys(this._nodeTypes); };
Graph.prototype.getNodesByType = function(nodeType) {
    if (this._nodeTypes[nodeType] === undefined) { return []; }
    return this._nodeTypes[nodeType].map(function(node) {
        return node;
    });
};
Graph.prototype.addNode = function(node, linkInGraph) {
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
    linkInGraph = linkInGraph === undefined ? true : linkInGraph;
    this._graphImpl.setNode(node.getId(), node);
    node.setGraph(this);
    // Create node type buckets.
    this._nodeTypes[node.getType()] = this._nodeTypes[node.getType()] || [];
    this._nodeTypes[node.getType()].push(node);

    if (linkInGraph) { node.linkInGraph(); }
};
Graph.prototype.removeNode = function(node) {
    if (!(node instanceof Node)) {
        throw Error('Parameter must be an instance of Node when calling Graph.removeNode.');
    }
    node.removeEdges();
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
Graph.prototype._addEdge = function(sourceId, targetId, edgeType, toType) {
    if (!this.nodeExists(sourceId) || !this.nodeExists(targetId)) {
        return utils.logEdgeTargetError(this, sourceId, targetId, edgeType);
    }

    toType = toType || this.getNodeById(targetId).getType();
    var newEdge = new Edge(sourceId, targetId, toType, edgeType);

    this._graphImpl.setEdge(sourceId, targetId, newEdge, edgeType);
};
Graph.prototype._addEdges = function(edges) {
    edges.forEach(function(edge) {
        this._addEdge(edge.getSourceId(), edge.getTargetId(), edge.getType(), edge.getTargetType());
    }, this);
};
Graph.prototype.getEdge = function(sourceId, targetId, edgeType) {
    return this._graphImpl.edge(sourceId, targetId, edgeType);
};
Graph.prototype._removeEdge = function(sourceId, targetId, edgeType) {
    this._graphImpl.removeEdge(sourceId, targetId, edgeType);
};
Graph.prototype.linkNodes = function() {
    // console.log("Graph.linkNodes ------------------------");
    this.getNodes().forEach(function(node) {
        node.linkInGraph();
    });
    // console.log("Graph.linkNodes ------------------------");
};
Graph.prototype.inEdges = function(sourceId, targetId) {
    return this._graphImpl.inEdges(sourceId, targetId);
};
Graph.prototype.outEdges = function(sourceId, targetId) {
    return this._graphImpl.outEdges(sourceId, targetId);
};
Graph.prototype.edgeExists = function(sourceId, targetId, type) {
    return this._graphImpl.hasEdge(sourceId, targetId, type);
};

// Manipulation functions
Graph.prototype.createNode = function(type, id) {
    if (type === undefined || type === null) { throw Error('type is a required param for `createNode`'); }
    id = id || this._generateNodeId();

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
