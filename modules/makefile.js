
var mkdirp = require("mkdirp")
var fs = require("fs")
var getDirName = require("path").dirname

module.exports.makefile = function(path, cb){
	mkdirp(getDirName(path), function (err) {
		if (err) cb(err)
		else fs.exists(path, function(exists) {
			if(!exists) {
				fs.open(path, 'w', callback);
			}
		});
	});
}

module.exports.makefileSync = function(path) {
	mkdirp.sync(getDirName(path), function(err) {
		if (err) cb(err)
		else if(!fs.existsSync(path)) {
			fs.openSync(path, 'w');
		}
	});
}

module.exports.makedir = function(path, cb) {
	mkdirp(path, cb);
}

module.exports.makedirSync = function(path) {
	mkdirp.sync(path);
}