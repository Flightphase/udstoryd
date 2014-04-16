var util = require('util');
var request = require('request');
var storage = require('node-persist');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');
var TileImage = require('./TileImage');
var config = require('../config');


storage.initSync();

var Instagram = function() {

	if(!config.instagram.hasOwnProperty('client_id'))
		throw new Exception('Must provide a client_id');

	if(!config.instagram.hasOwnProperty('client_secret'))
		throw new Exception('Must provide a client_id');

	var self = this;
	self.settings = storage.getItem("instagram") || {min_tag_id: null};


	var polling_interval = 5000;
	this.start = function() {
		var _poll = function(err){
			self.poll(function(err){
				if(err) console.log(err);
				else setTimeout(_poll, polling_interval);
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

	this.process_item = function(media, callback) {
		var text = "";
		if(media.hasOwnProperty('caption') && media.caption) {
			text = media.caption.text;
		}

		var info = {
			"id": media.id,
			"text": text,
			"url": media.images.low_resolution.url,
			"author": media.user.username,
			"source": "Instagram",
			"date": new Date(parseInt(media.created_time) * 1000)
		};

		var image = new TileImage();
		image.download(info, callback);
	}

	this.process_url = function(url, set_min_tag_id, level, callback) {
		callback = callback || function(){}
		//console.log(util.format("%s => %s", level, url));

		this.fetch_json(url, function(err, result){
			if(err) callback(err);
			else {
				//if(result.pagination.hasOwnProperty('next_url'))
				//	self.process_url(result.pagination.next_url, false, level+1);

				if(set_min_tag_id && result.pagination.min_tag_id) {
					self.settings.min_tag_id = result.pagination.min_tag_id;
					storage.setItem("instagram", self.settings);
				}
				if(result.data.length) 
					console.log("Instagram: Found "+result.data.length+" results");

				async.eachSeries(result.data, self.process_item, callback);
			}
		});
	}

	// http://stackoverflow.com/questions/20625173/how-does-instagrams-get-tags-tag-media-recent-pagination-actually-work
	this.poll = function(callback) {
		
		var query = config.instagram.query;
		//console.log('instagram.poll');

		var options = {
			'client_secret': config.instagram.client_secret, 
			'client_id': config.instagram.client_id
		};

		if(self.settings.min_tag_id)
			options.min_tag_id = self.settings.min_tag_id;

		var url = util.format("https://api.instagram.com/v1/tags/%s/media/recent?%s", query, qs.stringify(options));
		//console.log(url);
		self.process_url(url, true, 0, callback);
	}
}

module.exports = Instagram;


