'use strict';

var validationError = require('../validation-error');
var validateArity = require('./validation-utils').validateArity;
var isRequired = require('./validation-utils').isRequired;

function isOutOfRange(value, range) {
  return !(( range.minRange <= value ) && ( value <= range.maxRange ));
}

function validateIntProp(prop, propSpec, nodeId) {
  var errors = [];

  function isInteger(n) {
    return ( n === +n ) && ( n === (n|0) );
  }

  prop.vals.forEach(function(val) {
    if (!isInteger(val)) {
      errors.push(validationError(nodeId, [propSpec.name, 'must be an integer'].join(' ')));
    }

    if (isOutOfRange(val, propSpec.restrictions)) {
      errors.push(validationError(nodeId, [
        propSpec.name,
        'must be within',
        propSpec.restrictions.minRange,
        'and',
        propSpec.restrictions.maxRange
      ].join(' ')));
    }
  });

  return errors;
}

function validateFloatProp(prop, propSpec, nodeId) {
  var errors = [];

  prop.vals.forEach(function(val) {
    if (typeof val !== 'number') {
      errors.push(validationError(nodeId, [propSpec.name, 'must be a float'].join(' ')));
    }

    if (isOutOfRange(val, propSpec.restrictions)) {
      errors.push(validationError(nodeId, [
        propSpec.name,
        'must be within',
        propSpec.restrictions.minRange,
        'and',
        propSpec.restrictions.maxRange
      ].join(' ')));
    }
  });

  return errors;
}

function validateStringRestrictions(prop, restrictions, nodeId) {
  var errors = [];

  prop.vals.forEach(function(val) {
    if (restrictions.items.indexOf(val) === -1) {
      errors.push(validationError(nodeId, [val, 'is not a valid value for property', prop.key].join(' ')));
    }
  });

  return errors;
}

function validateStringProp(prop, propSpec, nodeId) {
  var errors = [];

  function valueIsEnumerated(restrictions) {
    return !!restrictions.items;
  }

  prop.vals.forEach(function(val) {
    if (typeof val !== 'string') {
      errors.push(validationError(nodeId, [propSpec.name, 'must be a string'].join(' ')));
    }
  });

  if (valueIsEnumerated(propSpec.restrictions)) {
    errors.push.apply(errors, validateStringRestrictions(prop, propSpec.restrictions, nodeId));
  }

  return errors;
}

function validateBoolProp(prop, propSpec, nodeId) {
  var errors = [];

  prop.vals.forEach(function(val) {
    if (typeof val !== 'boolean') {
      errors.push(validationError(nodeId, [propSpec.name, 'must be a boolean'].join(' ')));
    }
  });

  return errors;
}

module.exports = function validateProperties(node, nodeSpec) {
  var errors = [];
  var nodeId = node.getId();
  var nodePropMap = node.getProps();
  var propSpecMap = nodeSpec.propertySpecMap;

  Object.keys(propSpecMap).forEach(function(propName) {
    var propSpec = propSpecMap[propName];
    var prop = nodePropMap[propSpec.name];

    if (prop) {
      errors.push.apply(errors, validateArity(prop.vals, propSpec, nodeId));

      switch(propSpec.valueType.name) {
        case 'INTEGER':
          errors.push.apply(errors, validateIntProp(prop, propSpec, nodeId));
          break;
        case 'FLOAT':
          errors.push.apply(errors, validateFloatProp(prop, propSpec, nodeId));
          break;
        case 'STRING':
          errors.push.apply(errors, validateStringProp(prop, propSpec, nodeId));
          break;
        case 'BOOLEAN':
          errors.push.apply(errors, validateBoolProp(prop, propSpec, nodeId));
          break;
        default:
          throw new Error('Schema valueType ' + propSpec.valueType.name + ' not a valid type.');
      }
    } else if (isRequired(propSpec)) {
      errors.push(validationError(nodeId, [propSpec.name, 'is a required property'].join(' ')));
    }

  });

  return errors;
};