var io = require('socket.io').listen(3000);
var uuid = require('node-uuid');
var User = require('../shared/user.js').User;
var Room = require('../shared/room.js').Room;
var Lobby = require('./includes/lobby.js').Lobby;

Room.prototype.findUser = function(id){
    this.users.forEach(function(user, index, array){
        if(user.id == id){
            return user;
        }
    });
    return false;
}

User.prototype.say = function(text, room){
    if(text && this.socket){
        socket.emit('sayRoom', {user:this.id, room:room, text:text});
    }
}

Room.prototype.say = function(text){
    this.users.forEach(function(user, index, array){
        user.say(text, this.id);
    });
}

Lobby.prototype.announce = function(text){
    this.rooms.forEach(function(room, index, array){
        room.announce(text);
    });
}

Lobby.prototype.fetchRoom = function(id){
    this.rooms.forEach(function(room, index, array){
        if(room.id == id){
            return room;
        }
    });

    return null;
}

var lobby = new Lobby();

io.sockets.on('connection', function (socket){
    socket.emit('connected', {});

    socket.on('createRoom', function(data){
        var temp = new Room();
        temp.id = uuid.v4();

        lobby.rooms.push(temp);

        socket.emit('roomCreated', {roomID: temp.id});
    });

    socket.on('registerClient', function(data){
        var room = lobby.fetchRoom(data.roomID);
        console.log(room);
        console.log(data.roomID);
        console.log(lobby);

        var user = new User();

        user.id = uuid.v4();
        user.name = data.name;
        user.socket = socket;

        if(room){
            room.users.push(user);

            if(room.users.length == 1){
                room.admins.push(user.id);
                user.admin = true;
            }

            socket.emit('clientRegistered', {userId: user.id, admin:user.admin});
        }


    });

    socket.on('doSay', function(data){
        var room = Lobby.fetchRoom(data.roomID);

        if(room){
            var user = room.findUser(data.sender);
            if(user){
                room.say(user.name + ":" + data.text);
            }
        }
    });

    socket.on('doCmd', function(data){

    });

    socket.on('getClients', function(data){

    });
});