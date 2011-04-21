var fs          = require('fs');
var http        = require('http');
var urllib      = require('url');
var querystring = require('querystring');

function toUTF8Buff(s) {
    return new Buffer(s, "utf8");
}

// wrapper for a file object
var multipartFile = (function(){
    function cls(path){ // init
        this.path = path;
    };
    
    cls.prototype = {
        basename: function() {
          var parts = this.path.split(/\/|\\/);
          return parts[parts.length - 1];
        },
        contentType: function(){
            return 'application/octet-stream';
        },
        readFileSync: function(){
            return fs.readFileSync(this.path);
        }
    }; 
    return cls;
})();

// Builds multipart formdata for http request    
function makeMultipartFormData (fields, files) {
    var key, val, mpfile, body, lineCount, totalSize;
    var BOUNDARY = '----------ThIs_Is_tHe_bouNdaRY_$',
        CRLF = toUTF8Buff('\r\n'),
        CONTENT_TYPE = 'multipart/form-data; boundary=' + BOUNDARY,
        L = new Array();
        
        // fields
        for (var i=0; i < fields.length; i++) {
            key = fields[i][0];
            val = fields[i][1];
            L.push(toUTF8Buff('--' + BOUNDARY));
            L.push(toUTF8Buff('Content-Disposition: form-data; name="' + key + '"'));
            L.push(toUTF8Buff(''));
            L.push(toUTF8Buff(val.toString()));
        };
        
        // files
        for (var i     = 0; i < files.length; i++) {
            key        = files[i][0];
            val        = files[i][1];
            mpfile     = new multipartFile(val);
            
            L.push(toUTF8Buff('--' + BOUNDARY));
            L.push(toUTF8Buff('Content-Disposition: form-data; name="' + key + '"; filename="' + mpfile.basename() + '"'));
            L.push(toUTF8Buff('Content-Type: ' + mpfile.contentType()));
            L.push(toUTF8Buff(''));
            L.push(mpfile.readFileSync());  // value is already a buffer
        };
        
        // terminate body
        L.push(toUTF8Buff('--' + BOUNDARY + '--'));
        L.push(toUTF8Buff(''));
        
        // create a new buffer to contain the total size of request body
        lineFeedSize = L.length * CRLF.length;
        totalSize    = sum(L, function(i) {return i.length;}) + lineFeedSize;
        body         = new Buffer(totalSize);
        idx          = 0;
        
        // copy parts into final buffer
        for (var i=0; i < L.length; i++) {
            L[i].copy(body, idx);
            idx += L[i].length;
            CRLF.copy(body, idx);
            idx += CRLF.length;
        };
        
        return {
            contentType:CONTENT_TYPE, 
            body:body
        };
}


// stringify([["a", 1], ["a", 2], ["b", 3]])
// -> 'a=1&a=2&b=3'
function stringify (fields) {
    L = [];
    for (var i=0; i < fields.length; i++) {
        L.push(querystring.escape(fields[i][0]) + "=" + querystring.escape(fields[i][1].toString())); 
    };
    return L.join('&');
}

// check status code redirect
function isRedirect (statusCode) {
    
    var isRedirect = false,
        redirectCodes = [301,302, 303,307];
        
    for(var i in redirectCodes){
        if(statusCode == redirectCodes[i]) {
            isRedirect = true;
            break;
        }
    }
    return isRedirect;
}

function sum (lst, key) {
    var accum = 0;
    var key = key || function (j) { return j; };
    for (var i=0; i < lst.length; i++) {
        accum += key(lst[i]);
    };
    return accum;
}

function makeFormUrlEncodedData(fields) {
    CONTENT_TYPE = 'application/x-www-form-urlencoded';
    return {
        contentType: CONTENT_TYPE,
        body: stringify(fields)
    };
}


function SimpleRequest(url, method, fields, files, callback) {
    var _url = urllib.parse(url),
        multipart = files.length > 0,
        pathname  = false,
        method = method || "GET",
        isGETRequest = false,
        fields = fields || [];
    
    if(method.toUpperCase() === "GET" && !files){
        pathname = _url.pathname + "?" + stringify(fields);
        isGETRequest = true;
    }
    
    var options = {
      host: _url.hostname,
      port: _url.port || 80,
      path: pathname || _url.pathname,
      method: method
    };
    
    var data = [];
    var req = http.request(options, function(res) {
        
      // TODO: handle other encodings
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          data.push(chunk);
      });
      
      res.on('end', function(){
          // check and handle redirects
          var redirected = isRedirect(res.statusCode);
          if (redirected) {
              data = [];
              url  =  res.headers.location;
              SimpleRequest(url, method, fields, files, callback);
          }
          
          // otherwise just return data to callback
          else {
              callback(data.join(''));
          }
      });
    });
    req.setHeader('User-Agent', 'NodeJS IQ Engines API Binding');

    // Do a normal GET request
    if (isGETRequest) {
        req.end();
    }
    
    // Send multipart/form-data data in single chunk
    else if (multipart) {
        formdata = makeMultipartFormData(fields, files);
        req.setHeader('Content-Type', formdata.contentType);
        req.setHeader('Content-Length', formdata.body.length);
        req.end(formdata.body, "utf8");
    }
    
    // send application/x-www-form-urlencoded
    else {
        formdata = makeFormUrlEncodedData(fields);
        req.setHeader('Content-Type', formdata.contentType);
        req.setHeader('Content-Length', formdata.body.length);
        req.end(formdata.body);
    }
    
}

function test () {
    console.log('=> simple get');
    SimpleRequest('http://www.google.com/', "GET", [], [], function(data){});
    
    console.log('=> simple get with query and redirect');
    SimpleRequest('http://www.google.com/search', "GET", [['q',"data"]], [], function(data){});
    
    console.log('=> simpel post');
    SimpleRequest('http://www.postbin.org/yk8hrw', "POST", [['q',"data"]], [], function(data){});
    
    console.log('=> testing simple post with uploaded file');
    SimpleRequest('http://www.postbin.org/yk8hrw', "POST", [['a',"hello world"]], [['img', "./testdata/default.jpg"]], function(data){});
}

module.exports = {
    SimpleRequest: SimpleRequest,
    test:test
};

