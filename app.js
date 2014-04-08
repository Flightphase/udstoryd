var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var util = require('util');
var request = require('request');
var storage = require('node-persist');
var querystring = require('querystring');
var async = require('async');
var fs = require('fs');
var gm = require('gm');
var wrap = require('wordwrap')(50);

var routes = require('./routes');
var users = require('./routes/user');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

app.get('/', routes.index);
app.get('/users', users.list);
app.get('/instagram/subscribe', function(req, res){
	Instagram.subscriptions.handshake(req, res); 
});
app.post('/instagram/subscribe', function(req, res){
	console.log(req.body);
	res.send(200);
});



/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.render('error', {
        message: err.message,
        error: {}
    });
});


storage.initSync();
var Instagram = function(options) {

	var self = this;
	var client_id = options.client_id;
	var client_secret = options.client_secret;
	var endpoint = "https://api.instagram.com/v1";
	var tag = "loris";


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
			var local_path = util.format("%s/instagram/%s_caption.png", __dirname, id);
			var font = util.format("%s/fonts/HelveticaNeueLTCom-Roman.ttf", __dirname);
			var width = 220 * 5;
			var height = 110 * 5;
			gm(width, height, "#ddff99")
				.fill("#000000")
				.font(font)
				.fontSize(64)
				.drawText(10, 80, wrap(caption))
				.write(local_path, callback);
		} else {
			callback();
		}
	}

	this.download_image = function(media, callback) {
		var id = media.id;
		var url = media.images.standard_resolution.url;
		//var created_time = new Date(parseInt(media.created_time) * 1000);
		var local_path = util.format("%s/instagram/%s.jpg", __dirname, id);

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






var instagram = new Instagram({client_id: 'cb0179f1cd5d47cd92d544e5a750f087', client_secret: '0861e8916e954e58bb8d44e849fe7698'});
instagram.poll(function(err){
	if(err) console.log(err);
	else console.log("done!");
});


module.exports = app;
