var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var util = require('util');
var graph = require('fbgraph');
var querystring = require('querystring');
var _ = require('underscore');


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

var base_url = "http://5bfdf00d.ngrok.com";
var font = util.format("%s/fonts/HelveticaNeueLTCom-Roman.ttf", __dirname);

app.get('/', function(req, res){
	res.render('index', {'title': "UD Story Daemon"})
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



var Instagram = require('./modules/Instagram');
var Facebook = require('./modules/Facebook');
var config = require('./config')



var instagram = new Instagram(config.instagram);
var facebook = new Facebook(config.facebook);


instagram.start();
//facebook.start();






module.exports = app;
