var fs = require('fs');
var util = require('util');
var exec = require('child_process').exec;
var async = require('async');



exec("which exiftool", function(err, stdout, stderr){
	if(!stdout) 
		console.log("[Warning] Missing exiftool program on this system!");
});


var ExifImage = function(filename) {

	var self = this;
	var valid_tags = [
		"ImageNumber", 
		"OwnerName", 			// The service from whence the image came
		"ImageDescription", 	// The query that was used to fetch the image
		"Artist",				// The user who uploaded the image
		"Comment", 				// The text that goes along with the image
	];



	var escapeshell = function(cmd) {
		return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
	};


	/**
	* Set tags with a JavaScript object keys and values
	*/
	self.setObj = function(tags, callback) {
		console.log(tags);
		async.each(Object.keys(tags), function(tag, next){
			self.set(tag, tags[tag], next);
		}, callback);
	}


	/**
	*	Set a single exif tag
	*/
	self.set = function(tag, value, callback) {
		if(valid_tags.indexOf(tag)==-1) {
			callback("'"+tag+"'' is not a valid tag");
		} else if(!value) {
			console.log("No value provided for "+tag+". Skipping.");
			callback();
		} else {
			var cmd = util.format('exiftool -overwrite_original_in_place -%s="%s" "%s"', tag, escapeshell(value), filename);
			exec(cmd, callback);
		}
	}

	/**
	*	Get a single EXIF tag
	*/
	self.get = function(tag, callback) {
		if(valid_tags.indexOf(tag)==-1) {
			callback("'"+tag+"'' is not a valid tag");
			return;
		}

		var cmd = util.format('exiftool -S -%s "%s"', tag, filename);
		exec(cmd, function (err, stdout, stderr) {
			if(err) callback(err);
			else {
				var re = new RegExp(tag+": (.+)");
				var matches = re.exec(stdout);
				callback(null, matches[1]);
			}
		});
	}

	self.printTags = function() {
		self.getAll(function(err, tags){
			if(err) console.log(err);
			else console.log(util.inspect(tags));
		});
	}

	self.getAll = function(callback) {
		callback = callback || function(){}
		
		var cmd = util.format('exiftool -json "%s"', filename);
		exec(cmd, function (err, stdout, stderr) {
			if (err) callback(err)
			else callback(null, JSON.parse(stdout));
		});
	}

	self.setAll = function(tags, callback) {
		var tags_filename = filename+".exif.tmp.json";
		fs.writeFile(tags_filename, JSON.stringify(tags), function(err) {
			if(err) {
				fs.unlink(tags_filename)
				callback(err);
			} else {
				var cmd = util.format('exiftool -json="%s" "%s"', tags_filename, filename);
				exec(cmd, function (err, stdout, stderr) {
					if(err) callback(err);
					else {
						console.log('stdout: ' + stdout);
						console.log('stderr: ' + stderr);
						fs.unlink(tags_filename, callback);
					}
				});
			}
		}); 
	}
}


module.exports = ExifImage;

