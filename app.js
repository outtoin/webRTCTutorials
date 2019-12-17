var createError = require('http-errors');
const express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var usersRouter = require('./routes/users');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// websocket handler

let peers = {};
let sockets = {};
io.on('connection', function (socket) {
  socket.on('login', function(data) {
    console.log('Client logged-in:\n name:' + data.name);

    socket.name = data.name;
    socket.type = data.type;

    sockets[socket.name] = socket;

    io.emit('login', data.name);
  });

  socket.on('join', function() {
    console.log('Joined: ' + socket.name);
    for (let name in peers) {
      console.log('to: ' + name);
      peers[name].emit('addPeer', {'name': socket.name, 'need_offer': false});
      socket.emit('addPeer', {'name': name, 'need_offer': true});
    }
    peers[socket.name] = socket;
    // console.log(peers);
  });

  socket.on('logout', function (data) {
    console.log('Client logged-out:\\n name:' + data.name);

    io.emit('logout', data.name);
  });

  socket.on('relaySessionDescription', function (data) {
    let name = data.name;
    let sessionDescription = data.session_description;
    // console.log("["+ socket.name + "] relaying session description to [" + name + "] ", sessionDescription);

    if (name in sockets) {
      sockets[name].emit('sessionDescription', {'name': socket.name, 'session_description': sessionDescription});
    }
  });

  socket.on('relayICECandidate', function (data) {
    let name = data.name;
    let iceCandidate = data.ice_candidate;

    if (name in sockets) {
      sockets[name].emit('iceCandidate', {'name': socket.name, 'ice_candidate': iceCandidate});
    }
  })

});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = {
  app: app,
  server: server,
};
