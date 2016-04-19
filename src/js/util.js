function StringBuilder() {
	var strings = [];

	var verify = function (string) {
		if (!defined(string)) {
			return '';
		}
		if (getType(string) != getType('')) {
			return String(string);
		}
		return string;
	};

	var defined = function (el) {
		return el !== null && typeof el !== 'undefined';
	};

	var getType = function (instance) {
		if (!defined(instance.constructor)) {
			throw Error('Unexpected object type');
		}
		var type = String(instance.constructor).match(/function\s+(\w+)/);

		return defined(type) ? type[1] : 'undefined';
	};

	this.append = function (string) {
		string = verify(string);
		if (string.length > 0) {
			strings.push(string);
		}
		return this;
	};

	this.toString = function() {
		return strings.join('');
	};
}

function doFreeze(o) {
	Object.preventExtensions(o);
	Object.freeze(o);
}

function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
}

function logEdgeError(graph, sourceId, targetId, edgeType) {
    var message;

    if (!graph.nodeExists(sourceId) && !graph.nodeExists(targetId)) {
        message = [
            'Cannot create `',
            edgeType,
            '` edge between non-existent node ids `',
            sourceId,
            '` and `',
            targetId,
            '`.'
        ].join('');
    } else if (!graph.nodeExists(sourceId)) {
        message = [
            'Cannot create `',
            edgeType,
            '` edge from non-existent node id `',
            sourceId,
            '` to node id `',
            targetId,
            '`.'
        ].join('');
    } else if (!graph.nodeExists(targetId)) {
        message = [
            'Cannot create `',
            edgeType,
            '` edge from node id `',
            sourceId,
            '` to non-existent node id `',
            targetId,
            '`.'
        ].join('');
    }

    if (message) { console.warn(message); }
    return message;
}

module.exports.StringBuilder = StringBuilder;
module.exports.doFreeze = doFreeze;
module.exports.deepClone = deepClone;
module.exports.logEdgeError = logEdgeError;
