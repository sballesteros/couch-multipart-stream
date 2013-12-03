var path = require('path')
  , Readable = require('stream').Readable
  , fs = require('fs')
  , uuid = require('node-uuid')
  , combine = require('combine-streams');

/**
 * doc is an object with an _attachements property (see here:
 * http://docs.couchdb.org/en/latest/api/document/common.html#creating-multiple-attachments)
 * the length of each attachment must be set as well as a _steam
 * property containing a readable stream. _stream won't be serialized
 */
module.exports = function(doc){

  var boundary = uuid();

  var docjson = JSON.stringify(doc, function censor(key, value) {
    if (key == "_stream" && value instanceof Readable) {
      return undefined;
    }
    return value;
  });

  var preamble = '--' + boundary + '\r\n' + 'Content-Type: application/json' + '\r\n\r\n';

  var size = Buffer.byteLength(preamble) + Buffer.byteLength(docjson);

  var s = combine()
    .append(preamble)
    .append(docjson);

  for(var key in doc._attachments){
    preamble = '\r\n--' + boundary + '\r\n' + 'Content-Disposition: attachment; filename="' + key +'"' + '\r\n\r\n';
    s = s.append(preamble).append(doc._attachments[key]._stream);
    size += Buffer.byteLength(preamble) + doc._attachments[key].length;
  }

  preamble = '\r\n--' + boundary + '--';
  s = s.append(preamble)
    .append(null);

  size += Buffer.byteLength(preamble);

  s.headers = {
    'Content-Type': 'multipart/related; boundary=' + boundary,
    'Content-Length': size
  };

  return s;
};
