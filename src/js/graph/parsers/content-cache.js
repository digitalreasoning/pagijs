'use strict';

var util = require('util');
var Transform = require('stream').Transform;

var CONTENT_OPEN_TAG = /<content[^>]*>/;
var CONTENT_CLOSE_TAG = /<\/content>/;
var CONTENT_CAPTURE = /<content[^>]*>([^<]*)<\/content>/;

util.inherits(ContentCache, Transform);

function ContentCache(options) {
  if (!options || typeof options !== 'object') {
    options = {};
  }

  if (!(this instanceof ContentCache)) {
    return new ContentCache(options);
  }

  Transform.call(this, options);

  this.buffer = '';
  this.rawContent = '';
}

ContentCache.prototype._transform = function(chunk, encoding, done) {
  var data;

  if (this.buffer.length === 0 && this.rawContent.length === 0) {
    data = chunk.toString();
    if (data.match(CONTENT_OPEN_TAG) && data.match(CONTENT_CLOSE_TAG)) {
      this.rawContent = data.match(CONTENT_CAPTURE)[1];
    } else {
      this.buffer += data;
    }
  } else if (this.buffer.length > 0 && this.rawContent.length === 0) {
    this.buffer += chunk.toString();

    if (this.buffer.match(CONTENT_OPEN_TAG) && this.buffer.match(CONTENT_CLOSE_TAG)) {
      this.rawContent = this.buffer.match(CONTENT_CAPTURE)[1];
      this.buffer = '';
    }
  }

  done(null, chunk);
};

module.exports = ContentCache;
