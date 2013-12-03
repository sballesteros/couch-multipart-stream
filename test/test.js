var fs = require('fs')
  , Readable = require('stream').Readable
  , http = require('http')
  , assert = require('assert')
  , cms = require('..');

var nano = require('nano')('http://localhost:5984');

describe('multipart/related stream', function(){

  var dbName = 'test-cms-' + Math.floor(Math.random()*100000000).toString(); 

  before(function(done){
    nano.db.create(dbName, done);
  });

  it('should PUT a doc with mutiple attachments', function(done){
    
    var x1 = [["a","b"],[1,2],[3,4]].join('\n')
      , x2 = [["c","d"],[5,6],[7,8]].join('\n');

    var s1 = new Readable();
    s1.push(x1);
    s1.push(null);

    var s2 = new Readable();
    s2.push(x2);
    s2.push(null);
    
    var doc = {
      foo: 'bar',
      _attachments: {
        'x1.csv': {follows: true, length: Buffer.byteLength(x1), 'content_type': 'text/csv', _stream: s1},
        'x2.csv': {follows: true, length: Buffer.byteLength(x2), 'content_type': 'text/csv', _stream: s2 }
      }
    };

    var s = cms(doc);

    var options = {
      port: 5984,
      hostname: '127.0.0.1',
      method: 'PUT',
      path: '/' + dbName + '/test_doc',
      headers: s.headers
    };

    var req = http.request(options, function(res){     
      res.resume();
      res.on('end', function(){        
        assert.equal(res.statusCode, 201);
        
        var db = nano.use(dbName);
        db.attachment.get('test_doc', 'x1.csv', function(err, body){
          if(err) throw err;
          assert.equal(body.toString(), x1);

          db.attachment.get('test_doc', 'x2.csv', function(err, body){
            if(err) throw err;
            assert.equal(body.toString(), x2);
            done();
          });
        });

      });
    });
    s.pipe(req);
    
  });

  after(function(done){
    nano.db.destroy(dbName, done);
  });

});
