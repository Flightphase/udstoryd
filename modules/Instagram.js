var util = require('util');
var request = require('request');
var storage = require('node-persist');
var querystring = require('querystring');
var async = require('async');
var fs = require('fs');
var gm = require('gm');
var wrap = require('wordwrap')(50);

storage.initSync();

var Instagram = function(options) {

	var self = this;
	var client_id = options.client_id;
	var client_secret = options.client_secret;
	var endpoint = "https://api.instagram.com/v1";
	var tag = options.tag || "blue";
	var directory = options.directory || "./instagram";
	var font = options.font || null;

	this.fetch_json = function(url, callback) {
		request(url, function (error, response, body) {
			if (error) {
				callback(error, null);
			} else if(response.statusCode != 200) {
				callback(response.statusCode, null);
			} else {
				try {
					var json = JSON.parse(body);
					//console.log(util.inspect(json));
					callback(null, json);
				} catch(err) {
					callback(err);
				}
			}
		});
	}

	this.make_caption = function(media, callback){
		if(media.caption) {
			var id = media.id;
			var user = media.user.username;
			var caption = media.caption.text; 
			var local_path = util.format("%s/%s_caption.png", directory, id);
			var width = 220 * 5;
			var height = 110 * 5;
			
			var img = gm(width, height, "#ddff99")
				.fill("#000000")
				.fontSize(64);

			if(font) img.font(font);
			img.drawText(10, 80, wrap(caption));
			img.write(local_path, callback);
		} else {
			callback();
		}
	}

	this.download_image = function(media, callback) {
		var id = media.id;
		var url = media.images.standard_resolution.url;
		//var created_time = new Date(parseInt(media.created_time) * 1000);
		var local_path = util.format("%s/%s.jpg", directory, id);

		fs.exists(local_path, function(exists){
			if(exists) {
				console.log("WARNING: fetched an image twice!");
				callback();
			} else {
				console.log(local_path);
				var writeStream = fs.createWriteStream(local_path);
				writeStream.on('close', callback);
				request(url).pipe(writeStream);
			}
		}); 
	}


	this.process_media = function(media, callback) {

		var make_caption = function(next){ self.make_caption(media, next); };
		var download_image = function(next){ self.download_image(media, next); };

		async.parallel([download_image, make_caption], callback);
	}


	this.process_url = function(url, set_min_tag_id, level, callback) {
		callback = callback || function(){}
		console.log(util.format("%s => %s", level, url));
		if(level>1) {
			callback("Too deep!");
			return;
		}

		this.fetch_json(url, function(err, result){
			if(err) callback(err);
			else {
				if(result.pagination.hasOwnProperty('next_url'))
					self.process_url(result.pagination.next_url, false, level+1);

				if(set_min_tag_id) 
					storage.setItem("instagram", {'min_tag_id': result.pagination.min_tag_id });

				async.eachSeries(result.data, self.process_media, callback);
			}
		});
	}

	// http://stackoverflow.com/questions/20625173/how-does-instagrams-get-tags-tag-media-recent-pagination-actually-work
	this.poll = function(callback) {
		
		var options = {'client_secret': client_secret, 'client_id': client_id};
		if(storage.getItem('instagram')) 
			options.min_tag_id = storage.getItem('instagram').min_tag_id;

		var url = util.format("%s/tags/%s/media/recent?%s", endpoint, tag, querystring.stringify(options));
		self.process_url(url, true, 0, callback);
	}
}

module.exports = Instagram;


