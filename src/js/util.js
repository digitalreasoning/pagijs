function StringBuilder() {
	var strings = [];

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

	var verify = function (string) {
		if (!defined(string)) {
			return '';
		}
		if (getType(string) !== getType('')) {
			return String(string);
		}
		return string;
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
    function forceString(input) {
        return '' + input;
    }
    if (!graph.nodeExists(sourceId) && !graph.nodeExists(targetId)) {
        message = [
            'Cannot create `',
            forceString(edgeType),
            '` edge between non-existent node ids `',
            forceString(sourceId),
            '` and `',
            forceString(targetId),
            '`.'
        ].join('');
    } else if (!graph.nodeExists(sourceId)) {
        message = [
            'Cannot create `',
            forceString(edgeType),
            '` edge from non-existent node id `',
            forceString(sourceId),
            '` to node id `',
            forceString(targetId),
            '`.'
        ].join('');
    } else if (!graph.nodeExists(targetId)) {
        message = [
            'Cannot create `',
            forceString(edgeType),
            '` edge from node id `',
            forceString(sourceId),
            '` to non-existent node id `',
            forceString(targetId),
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
