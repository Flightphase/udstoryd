var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var util = require('util');

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


var Instagram = require('./modules/Instagram');

var options = {
	client_id: 'cb0179f1cd5d47cd92d544e5a750f087', 
	client_secret: '0861e8916e954e58bb8d44e849fe7698',
	tag: 'loris',
	directory: util.format("%s/instagram", __dirname),
	font: util.format("%s/fonts/HelveticaNeueLTCom-Roman.ttf", __dirname)
}
var instagram = new Instagram(options);
instagram.poll(function(err){
	if(err) console.log(err);
	else console.log("instagram.poll done");
});


var Facebook = require('./modules/Facebook');
var facebook = new Facebook();
facebook.poll(function(err){
	if(err) console.log(err);
	else console.log("facebook.poll done");
});



module.exports = app;
