var fs = require('fs');
var util = require('util');
var exec = require('child_process').exec;
var async = require('async');
var _ = require('underscore');
var gm = require('gm');
var wordwrap = require('wordwrap');
var request = require('request');

var config = require('../config');

exec("which exiftool", function(err, stdout, stderr){
	if(!stdout) 
		console.log("[Warning] Missing exiftool program on this system!");
});

var colors = ["#36cc24", "#fc3cb8", "#48bfec"];

var url_regex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

var TileImage = function(options) {

	options = options || {};
	var self = this;
	var font_size = 16;
	var wrap = wordwrap(26);
	
	var logger = options.logger || console;
	

	self.download = function(options, callback) {

		self.photo_path = util.format("%s/%s.jpg", config.download_dir, options.id);
		self.caption_path =  util.format('%s/%s.jpg', config.captions_dir, options.id);
		self.color = colors[Math.floor(Math.random()*colors.length)];

		if(fs.existsSync(self.photo_path)) {
			logger.warn("WARNING: fetched an image twice!");
		}
		
		logger.info("remote_url = "+options.url);
		logger.info("local_path = "+self.photo_path);

		// Filter out URLs
		options.text = options.text.replace(url_regex, "");

		// http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/index.html
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


		var download_small = function(done) {

			var width = 110;
			var height = 110;
			gm(request(options.url))
				.quality(100)
				.resize(width+"^", height+"^")
				.gravity('Center')
				.crop(width, height)
				.fill(self.color)
				.drawRectangle(0, 0, 10, 110)
				.write(self.photo_path, function(err){
					if(err) done(err);
					else self.setTags(tags, self.photo_path, done);
				});
		}

		var make_caption = function(done) {
			//console.log("make_caption");
			
			var width = 220;
			var height = 220;

			// Create the overall image
		    var img = gm(self.photo_path)
		    	.quality(100)
		        .gravity('NorthWest')
		        .background(self.color)
		        .extent(width, height)
		        .fill(self.color)
		        .drawRectangle(0, 0, 10, 110)
		        .fill("#ffffff");

		    // Draw Caption
		    if(options.text) {
		    	img.font(config.font_bold)
		    		.fontSize(font_size)
		        	.drawText(10, 130, wrap(options.text).split("\n").slice(0,3).join("\n"));
			}
			
			// Draw the byline
			img.font(config.font_medium)
				.fontSize(font_size)
		        .drawText(10, height-15, "by "+options.author)
		    
		    // Draw the source in small text up top just for reference
		    img.fontSize(14)
		        .drawText(120, 16, options.source)
		    
		    img.write(self.caption_path, function(err){
				if(err) done(err);
				else self.setTags(tags, self.caption_path, done);
		    });
		}

		async.series([download_small, make_caption], callback);
	}


	/**
	*	Set a bunch of exif tag
	*/
	self.setTags = function(tags, path, callback) {
		var cmd = "exiftool -overwrite_original_in_place ";
		for(var key in tags) {
			var value = (tags[key] || "None").replace(/(["'$`\\])/g,'\\$1');
			cmd += util.format("-%s=$'%s' ", key, value);
		}
		cmd += util.format("$'%s'", path);
		//logger.info(cmd);
		exec(cmd, callback);
	}


	/**
	*	Set a single exif tag
	*/
	self.setTag = function(tag, value, path, callback) {
		value = value || "None";
		value = value.replace(/(["'$`\\])/g,'\\$1');
		var cmd = util.format("exiftool -overwrite_original_in_place -%s=$'%s' $'%s'", tag, value, path);
		exec(cmd, callback);
	}


	/**
	*	Get a single EXIF tag
	*/
	self.getTag = function(tag, callback) {
		var cmd = util.format('exiftool -S -%s "%s"', tag, self.photo_path);
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
		
		var cmd = util.format('exiftool -json "%s"', self.photo_path);
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

