'use strict';

var nameMap = null;

module.exports.setNames = setNames;
module.exports.unsetNames = unsetNames;
module.exports.getReadableName = getReadableName;
module.exports.parseName = parseName;

function setNames(nodeTypeMap) {
  nameMap = nodeTypeMap;
}

function unsetNames() {
  nameMap = null;
}

function getReadableName(name) {
  var readableName = nameMap[name].readableName || name;
  return readableName;
}

function parseName(spec) {
  var name = spec.readableName || spec.name;
  return name;
}