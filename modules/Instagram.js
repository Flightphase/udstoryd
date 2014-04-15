var util = require('util');
var request = require('request');
var storage = require('node-persist');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');
var ExifImage = require('./ExifImage');

// var gm = require('gm');
// var wrap = require('wordwrap')(50);

storage.initSync();

var Instagram = function(options) {

	if(!options.hasOwnProperty('client_id'))
		throw new Exception('Must provide a client_id');

	if(!options.hasOwnProperty('client_secret'))
		throw new Exception('Must provide a client_id');


	var self = this;
	self.name = "Instagram";
	self.settings = storage.getItem("instagram") || {min_tag_id: null};


	var client_id = options.client_id;
	var client_secret = options.client_secret;
	var endpoint = "https://api.instagram.com/v1";
	var directory = options.download_dir;
	var query = options.query;
	


	fs.exists(directory, function(exists) {
		if (!exists) fs.mkdir(directory);
	});



	var polling_interval_ref = null;
	var polling_interval = 5000;

	this.start = function() {
		var _poll = function(err){
			self.poll(function(err){
				if(err) console.log(err);
				else 
					polling_interval_ref = setTimeout(_poll, polling_interval);
			});
		}
		_poll();
	}


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

	/*
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
	*/

	this.download_image = function(media, callback) {
		var id = media.id;
		var url = media.images.low_resolution.url;
		//var created_time = new Date(parseInt(media.created_time) * 1000);
		var local_path = util.format("%s/%s.jpg", directory, id);

		fs.exists(local_path, function(exists){
			if(exists) {
				console.log("WARNING: encountered an image twice!");
				callback();
			} else {
				console.log(local_path);
				var writeStream = fs.createWriteStream(local_path);
				writeStream.on('close', function(){
					//console.log(util.format(media));
					var img = new ExifImage(local_path);
					var tags = {
						"Comment": media.caption.text, 
						"Artist": media.user.username, 
						"ImageDescription": media.tags.join()
					};
					//console.log(tags);
					img.setObj(tags, function(){
						img.printTags();
						callback();
					});
				});
				writeStream.on('error', callback);
				request(url).pipe(writeStream);
			}
		}); 
	}

	this.process_url = function(url, set_min_tag_id, level, callback) {
		callback = callback || function(){}
		console.log(util.format("%s => %s", level, url));

		this.fetch_json(url, function(err, result){
			if(err) callback(err);
			else {
				//if(result.pagination.hasOwnProperty('next_url'))
				//	self.process_url(result.pagination.next_url, false, level+1);

				if(set_min_tag_id && result.pagination.min_tag_id) {
					self.settings.min_tag_id = result.pagination.min_tag_id;
					storage.setItem("instagram", self.settings);
				}
				
				async.eachSeries(result.data, self.download_image, callback);
			}
		});
	}

	// http://stackoverflow.com/questions/20625173/how-does-instagrams-get-tags-tag-media-recent-pagination-actually-work
	this.poll = function(callback) {
		
		var options = {
			'client_secret': client_secret, 
			'client_id': client_id, 
			'min_tag_id': self.settings.min_tag_id
		};

		var url = util.format("%s/tags/%s/media/recent?%s", endpoint, query, qs.stringify(options));
		self.process_url(url, true, 0, callback);
	}

}

module.exports = Instagram;


