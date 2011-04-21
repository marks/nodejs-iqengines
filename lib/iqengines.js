var fs       = require('fs');
var U        = require('./underscore');
var sha      = require('./sha');
var srequest = require('./simplerequest');

// =============
// = Constants =
// =============
var BASE_URL    = "http://api.iqengines.com/v1.2",
    QUERY_URL   = BASE_URL + "/query/",
    RESULT_URL  = BASE_URL + "/result/",
    UPDATE_URL  = BASE_URL + "/update/",
    OBJECTS_URL = BASE_URL + "/object/";

// =========
// = Utils =
// =========
function basename (path) {
    var parts = path.split(/\/|\\/);
    return parts[parts.length - 1];
}

function makeTimestamp()
{
    var t = new Date(),
        formatted = String('0000' + t.getUTCFullYear()).slice(-4)   + 
                    String('00'   + (t.getUTCMonth()+1)).slice(-2)  + // plus 1 because months are 0 indexed in js
                    String('00'   + t.getUTCDate()).slice(-2)       +
                    String('00'   + t.getUTCHours()).slice(-2)      +
                    String('00'   + t.getUTCMinutes()).slice(-2)    +
                    String('00'   + t.getUTCSeconds()).slice(-2)    ;
    return formatted;
}

function makeSignature(fields, files, secret)
{
    var joined      = [],
        rawstring   = '',
        fields      = U.clone(fields),
        files       = U.clone(files);
    
    if (files)
    {
        for (var i=0; i < files.length; i++) {
            var field = files[i][0];
            var filename = basename(files[i][1]);
            fields.push([field, filename]);
        };
    }

    // Sort fields
    fields = fields.sort();
    
    // Join into a long string of fieldnames + values
    for (var i=0; i < fields.length; i++)
    {
         joined.push(fields[i].join(''));
    };
    
    rawstring = joined.join('');
    var hmacObj = new sha.SHA(rawstring, "ASCII");
    var hmac = hmacObj.getHMAC(secret, "ASCII", "SHA-1", "HEX");
	return hmac;
}




var Api = (function(){
    
    // init
    function cls(key, secret){
        this.api_key    = key || process.env.IQE_KEY;
        this.api_secret = secret || process.env.IQE_SECRET;
    };
    cls.prototype = {};

    // send a signed request
    cls.prototype._signedRequest = function (args, callback) {
        var d = { url: null, method: "POST", fields: null, files: null },
            args      = U.defaults(d, args),
            files     = U.clone(args.files),
            fields    = U.clone(args.fields),
            sig;

        // add file fields
        fields.push(["api_key", this.api_key]);
        fields.push(["time_stamp", makeTimestamp()]);

        sig = makeSignature(fields, files, this.api_secret);
        fields.push(["api_sig", sig]);

        // send request
        req = srequest.SimpleRequest(args.url, args.method, fields, files, callback);
        return sig;
    };
        
    // send query
    cls.prototype.sendQuery = function (args, callback) {
        var d = {
                img: null, 
                webhook: null, 
                extra: null, 
                modules: null,
                device_id: null, 
                multiple_results: null,
                json:true
            },
            args   = U.defaults(d, args),
            fields = [],
            files  = [],
            callback = callback || function(res){},
            cb     = args.json ? function(data){ callback(JSON.parse(data)); } : callback,
            sig;
        files.push(["img", args.img]);
        delete args.img;
        fields = U.select(U.items(args), function(i){ return i[1] != null && i[1] !== false;});
        sig = this._signedRequest({
            url: QUERY_URL,
            method: "POST",
            fields: fields,
            files: files
        }, cb);
        return sig;
    };
        
    // get result for a qid
    cls.prototype.getResult = function (args, callback)  {
        var d      = { qid:null, json:true },
            args   = U.defaults(d, args),
            fields = [],
            callback = callback || function(res){},
            cb     = args.json ? function(data){ callback(JSON.parse(data));} : callback;

        fields = U.select(U.items(args), function(i){ return i[1] != null && i[1] !== false;});
        this._signedRequest({
                url: RESULT_URL,
                method: "POST",
                fields: fields
            }, cb);
    };
        
    // opens a long-polling connection to retrieve query results 
    cls.prototype.waitResults =  function(args, callback) {
        var d        = { device_id:null, json:true },
            args     = U.defaults(d, args),
            fields   = [],
            callback = callback || function(res){},
            cb       = args.json ? function(data){ callback(JSON.parse(data));} : callback;
        fields  = U.select(U.items(args), function(i){ return i[1] != null && i[1] !== false;});
        this._signedRequest({
                url: UPDATE_URL,
                method: "POST",
                fields: fields
            }, cb); 
    };
        
    // add object to computer vision database
    cls.prototype.createObject =function(){
    };
    cls.prototype.updateObject = function(){
    };
    cls.prototype.getObject = function(){
    };
    cls.prototype.delObject = function(){
    };            

    return cls;
})();

module.exports = { Api: Api };
