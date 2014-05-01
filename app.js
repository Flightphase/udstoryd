var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var util = require('util');
var path = require("path");
var glob = require("glob");
var async = require("async");
var gm = require('gm');
var querystring = require('querystring');
var wrap = require('wordwrap')(25);

var TileImage = require('./modules/TileImage');
var Instagram = require('./modules/Instagram');
var Facebook = require('./modules/Facebook');
var Twitter = require('./modules/Twitter');
var config = require('./config')


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


app.get('/', function(req, res){
    var pattern = config.download_dir+"/*.jpg";
    glob(pattern, {}, function(err, files){
        var photos = files.map(function(file){
            return '/img?name='+path.basename(file, ".jpg");
        });
        res.render('index', {'title': "UD Story Daemon", 'photos': photos});
    });
});

app.get('/img', function(req, res){
    var local_path = util.format('%s/%s.jpg', config.download_dir, req.query.name);

    var img = new TileImage({local_path: local_path});
    img.getAllTags(function(err, tags){
    	if(err) console.log(err);

        res.set('Content-Type', 'image/jpeg'); // set the header here
        var size = {width: 110, height: 110};
        gm(local_path)
            .resize(size.width, size.height + ">")
            .gravity('Center')
            .extent(size.width, size.height)
        	.fill("#FFFFFF")
			.fontSize(12)
			.font(config.font)
			.drawText(5, 10, tags[0].Artist)
			.drawText(5, 20, wrap(tags[0].Comment || ""))
        	.stream(function (err, stdout, stderr) {
        		stdout.pipe(res)
       		});
    });
});

app.get('/test', function(req, res){
	var size = {width: 110, height: 110};
	gm("Dog.jpg")
		.resize(size.width+"^", size.height+"^")
		.gravity('Center')
		.crop(size.width, size.height)
		.stream(function (err, stdout, stderr) {
			stdout.pipe(res)
		});
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


var instagram = new Instagram();
var facebook = new Facebook();
var twitter = new Twitter();

instagram.start();
facebook.start();
twitter.start();




module.exports = app;
