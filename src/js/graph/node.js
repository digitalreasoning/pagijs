'use strict';

var Edge = require('./edge');
var constants = require('./constants');
var VALID_PROP_TYPES = constants.VALID_PROP_TYPES;
var STR_PROP = constants.STR_PROP;
var FLOAT_PROP = constants.FLOAT_PROP;
var INT_PROP = constants.INT_PROP;
var BOOL_PROP = constants.BOOL_PROP;
var CHILD_EDGE_TYPE = constants.CHILD_EDGE_TYPE;

function convertValue(type, value) {
    var newVal;
    switch (type) {
        case VALID_PROP_TYPES[STR_PROP]:
            newVal = value.toString(); break;
        case VALID_PROP_TYPES[FLOAT_PROP]:
            newVal = parseFloat(value); break;
        case VALID_PROP_TYPES[INT_PROP]:
            newVal = parseInt(value); break;
        case VALID_PROP_TYPES[BOOL_PROP]:
            newVal = value === 'true'; break;
        default:
            throw Error('Unknown Node property type `' + type + '`.');
    }
    return newVal;
}

function Node(id, graph, type) {
    this._id = id || null;
    this._type = type || null;
    this._features = { };
    this._properties = { };
    this._graph = graph;
}

Node.prototype.setId = function(id) { this._id = id; };
Node.prototype.getId = function() { return this._id; };
Node.prototype.setType = function(type) { this._type = type; };
Node.prototype.getType = function() { return this._type; };
Node.prototype.addProp = function(type, key, val) {
    var typeName = type.toLowerCase(),
        newVal;

    if (val !== undefined && val !== null) {
        newVal = convertValue(typeName, val);
        if (this._properties[key]) {
            this._properties[key].vals.push(newVal);
        } else {
            this._properties[key] = { type: typeName, key: key, vals: [newVal] };
        }
    } else {
        this._properties[key] = { type: typeName, key: key, vals: [] };
    }
};
Node.prototype.getProp = function(key) {
    if (this._properties[key] === undefined) { return []; }

    return this._properties[key].vals.map(function(val) {
        return val;
    });
};
Node.prototype.getFirstProp = function(key) {
    // convenience method for properties with known max arity of 1
    return this._properties[key] && this._properties[key].vals[0];
};
Node.prototype.getProps = function() {
    return JSON.parse(JSON.stringify(this._properties));
};

Node.prototype.addEdge = function(targetId, edgeType, targetType) {
    // console.log("ADD EDGE for nodeId: " + this.getId() + ", targetId: " + targetId + ", targetType: " + targetType + ", edgeType: " + edgeType + ".");
    this._graph._addEdge(this.getId(), targetId, edgeType, targetType);
};
Node.prototype.getEdges = function() {
    return this._graph.outEdges(this.getId()).map(function(edge) {
        return this._graph.getEdge(edge.v, edge.w, edge.name);
    }, this).filter(function(edge) { return edge.getType() !== CHILD_EDGE_TYPE; });
};
Node.prototype.getEdgesByType = function(edgeType) {
    return this.getEdges().filter(function(edge) {
        return edge.getType() === edgeType;
    });
};
Node.prototype.getFirstEdgeByType = function(edgeType) {
    var edges = this.getEdgesByType(edgeType);
    return edges.length > 0 ? edges[0] : undefined;
};
Node.prototype.hasTraitSpan = function() {
    return this._graph.getNodeTypesAsSpan()[this.getType()] !== undefined;
};
Node.prototype.hasTraitSequence = function() {
    return this._graph.getNodeTypesAsSequence()[this.getType()] !== undefined;
};
Node.prototype.hasTraitSpanContainer = function() {
    return this._graph.getNodeTypesAsSpanContainer()[this.getType()] !== undefined;
};
Node.prototype.setGraph = function(graph) {
    this._graph = graph;
};
Node.prototype.removeGraph = function() { this._graph = null; };

Node.prototype.removeEdge = function(edge) {
    if (!(edge instanceof Edge)) {
        throw Error("`Node.removeEdge` only accepts an instance of Edge.");
    }
    if (edge.getSourceId() !== this.getId()) {
        throw Error('Node id `' + this.getId() + '` is not the source of edge, cannot remove');
    }

    // console.log("REMOVE EDGE nodeId: " + this.getId() + ", targetId: " + aEdge.getTargetId() + ", targetType: " + aEdge.getTargetType() + ", edgeType: " + aEdge.getType() + ".");
    this._graph._removeEdge(this.getId(), edge.getTargetId(), edge.getType());
};
Node.prototype.removeEdges = function() {
    var self = this;
    // Remove the standard edges
    self.getEdges().forEach(function(edge) {
        self.removeEdge(edge);
    });
};

// Span/SpanContainer trait functions
Node.prototype.getText = function() {
    var isSpan = this.hasTraitSpan(), isSpanContainer = this.hasTraitSpanContainer();
    if (!isSpan && !isSpanContainer) {
        throw Error("Calling `getText` on a Node that does not have the `span` or `spanContainer` trait.");
    }
    return this._graph.getContent().slice(this.getStartIndex(), this.getEndIndex());
};

function getSpanContainerIndex(node, isStart) {
    var childNode = isStart ? node.getFirst() : node.getLast();
    var idx = -1;

    if (childNode && isStart) {
        idx = childNode.getStartIndex();
    } else if (childNode) {
        idx =  childNode.getEndIndex();
    }

    return idx;
}
Node.prototype._getIndex = function(isStart) {
    if (this.hasTraitSpan()) {
        var start = this.getFirstProp('start');
        return isStart ? start : start + this.getFirstProp('length');
    }
    if (this.hasTraitSpanContainer()) {
        return getSpanContainerIndex(this, isStart);
    } else {
        // Find all edges that are not the same type as the current node.
        // And determine which one has the proper index.
        var self = this;
        var reduced = this.getEdges().filter(function(edge) {
            return edge.getTargetType() !== self.getType();
        }).reduce(function(idx, edge) {
            var node = self._graph.getNodeById(edge.getTargetId());
            var newIndex = isStart ? node.getStartIndex() : node.getEndIndex();
            if (isStart) {
                if (newIndex < idx) { return newIndex; }
            } else {
                if (idx < newIndex) { return newIndex; }
            }
            return idx;
        }, isStart ? Infinity : Number.NEGATIVE_INFINITY);
        // Replace Infinity with -1
        reduced = reduced === Infinity                 ? -1 : reduced;
        reduced = reduced === Number.NEGATIVE_INFINITY ? -1 : reduced;
        return reduced;
    }
};
// The value returned is INclusive to the annotation.
Node.prototype.getStartIndex = function() {
    return this._getIndex(true);
};
// The value returned is EXclusive to the annotation.
Node.prototype.getEndIndex = function() {
    return this._getIndex();
};

// Sequence trait functions
Node.prototype.hasNext = function() {
    if (!this.hasTraitSequence()) { return false; }
    return !!this.getFirstEdgeByType('next');
};
Node.prototype.hasPrevious = function() {
    if (!this.hasTraitSequence()) { return false; }
    // Special case, there will not be an explicit `previous` edge.
    var previousImplEdges = this._getEdgesImplByLabels('in', ['next']);
    return previousImplEdges.length > 0;
};
Node.prototype.next = function() {
    if (!this.hasTraitSequence()) { throw Error("Calling `next` on a Node that does not have the `sequence` trait."); }
    var nextEdge = this.getFirstEdgeByType('next');

    if (!nextEdge) { return undefined; }
    return this._graph.getNodeById(nextEdge.getTargetId());
};
Node.prototype.previous = function(ids) {
    if (!this.hasTraitSequence()) { throw Error("Calling `previous` on a Node that does not have the `sequence` trait."); }
    // Special case, there will not be an explicit `previous` edge.
    // A sequence node should only have one incoming `next` edge, but to support broken states
    // you can optionally pass an ids filter that will remove nodes from options.
    var previousImplEdges = this._getEdgesImplByLabels('in', ['next']);

    if (ids) {
        previousImplEdges = previousImplEdges.filter(function(edge) {
            return ids.indexOf(edge.v) === -1;
        });
    }

    if (previousImplEdges.length < 1) { return undefined; }
    return this._graph.getNodeById(previousImplEdges[0].v);
};
Node.prototype._getEdgesImplByLabels = function(direction, labels)  {
    return this._graph[direction + 'Edges'](this.getId()).filter(function(edgeImpl) {
        return labels.indexOf(edgeImpl.name) !== -1;
    }, this._graph);
};

// SpanContainer trait functions
Node.prototype.getFirst = function() {
    if (!this.hasTraitSpanContainer()) { throw Error("Calling `getFirst` on a Node that does not have the `span container` trait."); }
    var firstEdge = this.getFirstEdgeByType('first');
    if (!firstEdge) { return undefined; }
    return this._graph.getNodeById(firstEdge.getTargetId());
};
Node.prototype.getLast = function() {
    if (!this.hasTraitSpanContainer()) { throw Error("Calling `getLast` on a Node that does not have the `span container` trait."); }
    var lastEdge = this.getFirstEdgeByType('last');
    if (!lastEdge) { return undefined; }
    return this._graph.getNodeById(lastEdge.getTargetId());
};

module.exports = Node;
