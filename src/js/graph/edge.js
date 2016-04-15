'use strict';

function Edge(sourceId, targetId, targetType, edgeType) {
  this._sourceId = sourceId || null;
  this._targetId = targetId || null;
  this._targetType = targetType || null;
  this._edgeType = edgeType || null;
}

Edge.prototype.getSourceId = function() { return this._sourceId; };
Edge.prototype.getTargetId = function() { return this._targetId; };
Edge.prototype.getTargetType = function() { return this._targetType; };
Edge.prototype.getEdgeType = function() { return this._edgeType; };

module.exports = Edge;
