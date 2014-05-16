var util = require('util');
var request = require('request');
var storage = require('node-persist');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');
var winston = require('winston');


var makefile = require('./makefile');
var repeat = require('./repeat');
var TileImage = require('./TileImage');
var config = require('../config');



var Instagram = function() {
	console.log("Constructing Instagram");

	var self = this;

	if(!config.instagram.hasOwnProperty('client_id'))
		throw new Exception('Must provide a client_id');

	if(!config.instagram.hasOwnProperty('client_secret'))
		throw new Exception('Must provide a client_id');

	storage.initSync();

	self.settings = storage.getItem("instagram") || { min_tag_id: null };

	makefile.makefileSync(config.instagram.logfile);

	var logger = new (winston.Logger)({
		transports: [
			//new (winston.transports.Console)({colorize: true, timestamp: true}),
			new (winston.transports.File)({ filename: config.instagram.logfile, timestamp: true  })
		]
	});

	self.logger = logger;



	this.fetch_json = function(url, callback) {
		request(url, function (error, response, body) {
			if (error) {
				callback(error, null);
			} else if(response.statusCode != 200) {
				callback("Couldn't fetch json: status code "+response.statusCode, null);
			} else {
				try {
					var json = JSON.parse(body);
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

		logger.log("info", media.images.low_resolution.url);
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
		
				logger.log("info", "Instagram: Found %s results", result.data.length);

				async.eachSeries(result.data, self.process_item, callback);
			}
		});
	}


	// http://stackoverflow.com/questions/20625173/how-does-instagrams-get-tags-tag-media-recent-pagination-actually-work
	this.poll = function(callback) {
		
		var query = config.instagram.query;

		process.stdout.write("ig-");
		logger.info("==Begin Instagram Poll==");
		
		var options = {
			'client_secret': config.instagram.client_secret, 
			'client_id': config.instagram.client_id
		};

		if(self.settings.min_tag_id)
			options.min_tag_id = self.settings.min_tag_id;

		var url = util.format("https://api.instagram.com/v1/tags/%s/media/recent?%s", query, qs.stringify(options));
		logger.info("Fetching %s", url);
		self.process_url(url, true, 0, callback);
	}



	self.running = true;
	repeat(self.poll, config.instagram.polling_pause, function(err){
		logger.error("Instagram is exiting because of an error:")
		logger.error(err);
		self.running = false;
	});
}

module.exports = Instagram;


