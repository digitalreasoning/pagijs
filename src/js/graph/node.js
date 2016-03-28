var Edge = require('./edge');
var VALID_PROP_TYPES = ['string', 'float', 'integer', 'boolean'];

function Node(id, type) {
    this._id = id || null;
    this._type = type || null;
    this._features = { };
    this._properties = { };
    this._edges = [];
    this._graph = null;
}
Node.prototype.setId = function(id) { this._id = id; };
Node.prototype.getId = function() { return this._id; };
Node.prototype.setType = function(type) { this._type = type; };
Node.prototype.getType = function() { return this._type; };
// Node.prototype.addFeature = function(key, val) { };
// Node.prototype.getFeature = function(key) { };
Node.prototype.addProp = function(type, key, val) {
    var newVal;
    type = type.toLowerCase();
    switch (type) {
        case VALID_PROP_TYPES[0]:
            newVal = val.toString(); break;
        case VALID_PROP_TYPES[1]:
            newVal = parseInt(val); break;
        case VALID_PROP_TYPES[2]:
            newVal = parseFloat(val); break;
        case VALID_PROP_TYPES[3]:
            newVal = val === 'true'; break;
        default:
            throw Error("Unknown Node property type `" + type + "`.");
    }

    if (Array.isArray(this._properties[key])) {
        this._properties[key].push({ type: type, key: key, val: newVal });
    } else {
        this._properties[key] = [{ type: type, key: key, val: newVal }];
    }
};
Node.prototype.getProp = function(key) {
    return this._properties[key] && this._properties[key].map(function(prop) {
        return prop.val;
    });
};
Node.prototype.getFirstProp = function(key) {
    // convenience method for properties with known max arity of 1
    return this._properties[key] && this._properties[key][0].val;
};
Node.prototype.getProps = function() {
    return JSON.parse(JSON.stringify(this._properties));
};
Node.prototype.addEdge = function(targetId, targetType, edgeType) {
    this._edges.push(new Edge(targetId, targetType, edgeType));
};
Node.prototype.getEdges = function() {
    return this._edges.map(function(edge) { return edge; });
};
Node.prototype.getEdgesByType = function(edgeType) {
    return this._edges.filter(function(edge) {
        return edge.getEdgeType() === edgeType;
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

// Span/SpanContainer trait functions
Node.prototype.getText = function() {
    var isSpan = this.hasTraitSpan(), isSpanContainer = this.hasTraitSpanContainer();
    if (!isSpan && !isSpanContainer) {
        throw Error("Calling `getText` on a Node that does not have the `span` or `spanContainer` trait.");
    }
    return this._graph.getContent().slice(this.getStartIndex(), this.getEndIndex());
};
Node.prototype._getIndex = function(isStart) {
    if (this.hasTraitSpan()) {
        var start = this.getFirstProp('start');
        return isStart ? start : start + this.getFirstProp('length');
    }
    if (this.hasTraitSpanContainer()) {
        return isStart ? this.getFirst().getStartIndex() : this.getLast().getEndIndex();
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
    if (!this.hasTraitSequence()) { throw Error("Calling `hasNext` on a Node that does not have the `sequence` trait."); }
    return !!this.getFirstEdgeByType('next');
};
Node.prototype.hasPrevious = function() {
    if (!this.hasTraitSequence()) { throw Error("Calling `hasPrevious` on a Node that does not have the `sequence` trait."); }
    // Special case, there will not be an explicit `previous` edge.
    // This library assumes a sequence node will only ever have one incoming `next` edge.
    var previousImplEdges = this._getEdgesImplByLabel('in', 'next');
    return previousImplEdges.length === 1;
};
Node.prototype.next = function() {
    if (!this.hasTraitSequence()) { throw Error("Calling `next` on a Node that does not have the `sequence` trait."); }
    return this._graph.getNodeById(this.getFirstEdgeByType('next').getTargetId());
};
Node.prototype.previous = function() {
    if (!this.hasTraitSequence()) { throw Error("Calling `previous` on a Node that does not have the `sequence` trait."); }
    // Special case, there will not be an explicit `previous` edge.
    // This library assumes a sequence node will only ever have one incoming `next` edge.
    var previousImplEdges = this._getEdgesImplByLabel('in', 'next');
    if (previousImplEdges.length !== 1) { return undefined; }
    return this._graph.getNodeById(previousImplEdges[0].v);
};
Node.prototype._getEdgesImplByLabel = function(direction, label)  {
    var graphImpl = this._graph._graphImpl;
    return graphImpl[direction + 'Edges'](this._id).filter(function(edgeImpl) {
        return graphImpl.edge(edgeImpl.v, edgeImpl.w) === label;
    });
};
// Breadth-first search for parents of a given node type.
Node.prototype._getParentsOfType = function(fnName, nodeType, stopOnFirst) {
    if (!this.hasTraitSequence()) { throw Error("Calling `" + fnName + "` on a Node that does not have the `sequence` trait."); }
    if (this._graph.getNodeTypes().indexOf(nodeType) === -1) {
        throw Error("`Node." + fnName + "`: '" + nodeType + "' is not a node type available in the graph.");
    }
    var currentNode, parentEdges, i, matchingNodes = [], self = this;
    // Store nodes that need to be visited in the currentNodes array.
    var currentNodes = this._getEdgesImplByLabel('in', 'parent').map(function(edgeImpl) {
        return self._graph.getNodeById(edgeImpl.v);
    });
    while (true) {
        // If nothing is left in the array, we didn't find a parent node.
        if (currentNodes.length === 0) { break; }
        currentNode = currentNodes.pop();
        // Found the parent, return it.
        if (currentNode.getType() === nodeType) {
            if (stopOnFirst) { return currentNode; }
            else { matchingNodes.push(currentNode); }
        }
        // Node was not the right type, check it's parents.
        parentEdges = currentNode._getEdgesImplByLabel('in', 'parent');
        for (i = 0; i < parentEdges.length; i++) {
            currentNodes.push(self._graph.getNodeById(parentEdges[i].v));
        }
    }
    return matchingNodes;
};
Node.prototype.getFirstParentOfType = function(nodeType) {
    return this._getParentsOfType('getFirstParentOfType', nodeType, true);
};
Node.prototype.getParentsOfType = function(nodeType) {
    return this._getParentsOfType('getParentsOfType', nodeType);
};

// SpanContainer trait functions
Node.prototype.getFirst = function() {
    if (!this.hasTraitSpanContainer()) { throw Error("Calling `getFirst` on a Node that does not have the `span container` trait."); }
    return this._graph.getNodeById(this.getFirstEdgeByType('first').getTargetId());
};
Node.prototype.getLast = function() {
    if (!this.hasTraitSpanContainer()) { throw Error("Calling `getLast` on a Node that does not have the `span container` trait."); }
    return this._graph.getNodeById(this.getFirstEdgeByType('last').getTargetId());
};

module.exports = Node;
