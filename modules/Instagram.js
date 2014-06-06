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

	storage.initSync({ dir: config.persist_dir });

	self.settings = storage.getItem("instagram") || { min_tag_id: null };

	makefile.makefileSync(config.instagram.logfile);

	var logger = new (winston.Logger)({
		transports: [
			//new (winston.transports.Console)({colorize: true, timestamp: true}),
			new (winston.transports.File)({ 
				filename: config.instagram.logfile, 
				timestamp: true,
				maxsize: 1048576*5    
			})
		]
	});

	self.logger = logger;



	this.fetch_json = function(url, callback) {
		callback = callback || function(){}
		request(url, function (error, response, body) {
			
			if (error) {
				callback(error, null);
			} else if(response.statusCode != 200) {
				logger.warn("Received "+response.statusCode+" status code! What's up?");
				callback(null, null);
			} else {
				var json;

				try {
					json = JSON.parse(body);
				} catch(err) {
					callback("Error parsing result json: "+body);
				}

				callback(null, json);
			}
		});
	}


	this.process_item = function(media, callback) {

		var text = util.format('%s/%s.json', config.json_dir, media.id);
		fs.writeFile(text, JSON.stringify(media, null, "\t"), function(err) {});


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

		var image = new TileImage({logger: logger});
		image.download(info, callback);
	}


	this.process_url = function(url, set_min_tag_id, level, callback) {
		callback = callback || function(){}
		//console.log(util.format("%s => %s", level, url));

		this.fetch_json(url, function(err, result){
			if(err) {
				callback(err);
			} else if(!result) {
				logger.warn("No result received from fetch_json");
				callback(null);
			} else {
				if(result.pagination.hasOwnProperty('next_url')) {
					self.process_url(result.pagination.next_url, false, level+1);
				}

				if(set_min_tag_id) {
					if(result.pagination.min_tag_id) {
						self.settings.min_tag_id = result.pagination.min_tag_id;
						//logger.info("self.settings.min_tag_id="+self.settings.min_tag_id);
						storage.setItem("instagram", self.settings);
					} else {
						//logger.warn("No pagination.min_tag_id found in result!");
					}
				}
		
				//logger.info("Found %s results", result.data.length);

				async.eachSeries(result.data, self.process_item, callback);
			}
		});
	}


	// http://stackoverflow.com/questions/20625173/how-does-instagrams-get-tags-tag-media-recent-pagination-actually-work
	this.poll = function(callback) {
		
		var query = config.instagram.query;

		process.stdout.write("ig-");
		//logger.info("==Begin Instagram Poll==");
		
		var options = {
			'client_secret': config.instagram.client_secret, 
			'client_id': config.instagram.client_id
		};

		if(self.settings.min_tag_id)
			options.min_tag_id = self.settings.min_tag_id;

		var url = util.format('https://api.instagram.com/v1/tags/%s/media/recent?%s', query, qs.stringify(options));
		logger.info('Fetching <a target="_blank" href="'+url+'">API endpoint</a>');
		self.process_url(url, true, 0, callback);
	}



	self.running = true;
	repeat(self.poll, config.instagram.polling_pause, function(err){
		logger.error("Instagram is exiting because of an error:")
		logger.error(err);
		console.log( new Error().stack )
		self.running = false;
	});
}

module.exports = Instagram;


