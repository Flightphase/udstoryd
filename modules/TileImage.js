var fs = require('fs');
var util = require('util');
var exec = require('child_process').exec;
var async = require('async');
var _ = require('underscore');
var gm = require('gm');
var wrap = require('wordwrap')(25);
var request = require('request');
var config = require('../config');

exec("which exiftool", function(err, stdout, stderr){
	if(!stdout) 
		console.log("[Warning] Missing exiftool program on this system!");
});

var colors = ["#36cc24", "#fc3cb8", "#48bfec"];

var TileImage = function(options) {

	options = options || {};
	var self = this;
	self.local_path = options.local_path || null;

	
	// http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/index.html

	self.download = function(options, callback) {
		self.local_path = util.format("%s/%s.jpg", config.download_dir, options.id);
		
		if(fs.existsSync(self.local_path)) {
			console.log("WARNING: fetched an image twice!");
			callback();
			return;
		}

		console.log(self.local_path);

		var size = { width: 110, height: 110 };

		var download_small = function(done) {

			var width = 110;
			var height = 110;
			gm(request(options.url))
				.resize(width+"^", height+"^")
				.gravity('Center')
				.crop(width, height)
				.write(self.local_path, done)

			//console.log("get_small");
			// gm(request(options.url))
			// 	.resize(size.width+"^", size.height+"^")
			// 	.gravity('Center')
			// 	.crop(size.width, size.height)
			// 	.fill(color)
			// 	.drawRectangle(0, 0, size.width*0.1, size.height)
			// 	.write(self.local_path, done);
		}

		// to do: combine this into one command!
		var set_tags = function(done){
			//console.log("set_tags");
			var tags = {
				"Headline": util.format("%s: %s", options.source, options.author), 
				"Comment": options.text, 
				"Caption": options.text, 
				"UserComment": options.text,
				"ImageDescription": options.text,
				"Artist": options.author, 
				"OwnerName": options.author,
				"Title": options.source,
				"Software": options.source
			};

			async.eachSeries(Object.keys(tags), function(tag, next){
				self.setTag(tag, tags[tag], next);
			}, done);
		}

		var make_caption = function(done) {
			//console.log("make_caption");
			var color = colors[Math.floor(Math.random()*colors.length)];
			var captions_path = util.format('%s/%s.png', config.captions_dir, options.id);
			var width = 220;
			var height = 220;
		    var img = gm(self.local_path)
		        .gravity('NorthWest')
		        .background(color)
		        .extent(width, height)
		        .fill(color)
		        .drawRectangle(0, 0, 10, 110)
		        .fontSize(18)
		        .fill("#ffffff");
		    if(options.text) img.font(config.font_bold)
		        .drawText(10, 130, wrap(options.text).split("\n").slice(0,3).join("\n"));
			img.font(config.font_medium)
		        .drawText(10, height-15, "by "+options.author)
		        .write(captions_path, done);
		}

		async.series([download_small, set_tags, make_caption], callback);
	}


	/**
	*	Set a single exif tag
	*/
	self.setTag = function(tag, value, callback) {
		value = value || "None";
		value = value.replace(/(["'$`\\])/g,'\\$1');
		var cmd = util.format("exiftool -overwrite_original_in_place -%s=$'%s' $'%s'", tag, value, self.local_path);
		exec(cmd, callback);
	}


	/**
	*	Get a single EXIF tag
	*/
	self.getTag = function(tag, callback) {
		var cmd = util.format('exiftool -S -%s "%s"', tag, self.local_path);
		exec(cmd, function (err, stdout, stderr) {
			if(err) callback(err);
			else {
				var re = new RegExp(tag+": (.+)");
				var matches = re.exec(stdout);
				callback(null, matches[1]);
			}
		});
	}

	/**
	*	Get all tags from this image.
	*/
	self.getAllTags = function(callback) {
		callback = callback || function(){}
		
		var cmd = util.format('exiftool -json "%s"', self.local_path);
		exec(cmd, function (err, stdout, stderr) {
			if (err) callback(err)
			else callback(null, JSON.parse(stdout));
		});
	}


	/*
	var writeStream = fs.createWriteStream(local_path);
	writeStream.on('close', function(){
		var img = new ExifImage(local_path);
		var info = {
			"text": post.message || "None",
			"author": post.from.name,
			"source": "Facebook"
		};
		img.setInfo(info, callback);
	});
	writeStream.on('error', callback);
	request(url).pipe(writeStream);

	self.printTags = function() {
		self.getAll(function(err, tags){
			if(err) console.log(err);
			else console.log(util.inspect(tags));
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
	*/
}


module.exports = TileImage;
