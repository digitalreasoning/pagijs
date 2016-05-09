// Description:
//   Provides access to the different graph parsers available in the library.

var GraphParserXml = require('../parsers/graphParserXml');
var ContentCache = require('../parsers/content-cache');
// var GraphParserFlat = require('./graphParserFlat');
// var GraphParserBinary = require('./graphParserBinary');

function parseXml(readableStream) {
    var cache = new ContentCache();
    readableStream.pipe(cache);
    return (new GraphParserXml()).parse(cache);
}
// function parseFlat(readableStream) {
//     return new GraphParserFlat(readableStream);
// }
// function parseBinary(readableStream) {
//     return new GraphParserBinary(readableStream);
// }

// General access function, defaults to XML.
module.exports.parse = parseXml;

// Parser implementations
module.exports.parseXml = parseXml;
// module.exports.parseFlat = parseFlat;
// module.exports.parseBinary = parseBinary;
