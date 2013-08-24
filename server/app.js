var io = require('socket.io').listen(3000);
var uuid = require('node-uuid');
var User = require('../shared/user.js').User;
var Room = require('../shared/room.js').Room;
var Lobby = require('./includes/lobby.js').Lobby;

Room.prototype.findUser = function(id, callback){
    this.users.forEach(function(user, index, array){
        if(user.id == id){
            callback(user);
            return true;
        }
    });
    return false;
}

User.prototype.say = function(text, roomID, type){
    if(text && this.socket){
        type = type ? type : 'normal';
        this.socket.emit('say', {user:this.id, room:roomID, text:text, type:type});
    }
}

User.prototype.sayOthers = function(text, room, type){
    if(text && this.socket && room){
        var user = this;
        room.users.forEach(function(userS){
            if(userS.id != user.id){
                userS.say(text, room.id, type);
            }
        });
    }
}

Room.prototype.say = function(text, type){
    this.users.forEach(function(user, index, array){
        user.say(text, this.id, type);
    });
}

Room.prototype.findByName = function(name, callback){
    this.users.forEach(function(user){
        if(user.name.toLowerCase() == name.toLowerCase()){
            callback(user);
            return true;
        }
    });
    return false;
}

Lobby.prototype.announce = function(text){
    this.rooms.forEach(function(room, index, array){
        room.say(text, room.id, 'announce');
    });
}

Lobby.prototype.fetchRoom = function(rid, callback){
    this.rooms.forEach(function(room, index, array){
        if(room.id == rid){
            callback(room);
            return true;
        }
    });
    return false;
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
        var room = lobby.fetchRoom(data.roomID, function(room){

            var user = new User();

            user.id = uuid.v4();
            user.name = data.name;
            user.socket = socket;

            var unique = true;

            room.users.forEach(function(userS){
                if(userS.name.toLowerCase() == user.name.toLowerCase()){
                    unique = false;
                }
            });

            if(room && unique){
                room.users.push(user);

                if(room.users.length == 1){
                    room.admins.push(user.id);
                    user.admin = true;
                }

                socket.set('userID', user.id);
                socket.set('roomID', room.id);
                room.users.forEach(function(user){
                    user.socket.emit('updateClients', {});
                });
                socket.emit('clientRegistered', {userID: user.id, admin:user.admin});
            }
        });

    });

    /*socket.on('doSay', function(data){
        var room = lobby.fetchRoom(data.roomID, function(room){
            if(room){
                var user = room.findUser(data.sender, function(user){
                    if(user){
                        room.say(user.name + ":" + data.text);
                    }
                });
            }
        });
    });*/

    socket.on('doCmd', function(data){
        console.log(data);
        if(data.sender && data.roomID){
            lobby.fetchRoom(data.roomID, function(room){
                if(room){
                    room.findUser(data.sender, function(user){
                       if(user){
                            tokenize(data.text, room, user); 
                       }
                    });
                }
            });
        }
    });

    socket.on('getClients', function(data){
         var room = lobby.fetchRoom(data.roomID, function(room){
            if(room){
                var users = [];
                room.users.forEach(function(user, index, array){
                    users.push(user.name);
                })
                socket.emit('sendClients', {room:data.roomID, clients: users});
            }
        });
    });

    socket.on('disconnect', function(){
        socket.get('userID', function(err, userID){
            socket.get('roomID', function(err, roomID){
                var room = lobby.fetchRoom(roomID, function(room){
                    room.users.forEach(function(user, index, array){
                        if(user.id == userID){
                            delete room.users[index];
                            room.users.forEach(function(user){
                                user.socket.emit('updateClients', {});
                            });
                            console.log('User Disconnected: ' + user.name)
                        }
                    });
                });
            });
        });
    });

    setTimeout(function(){
        lobby.rooms.forEach(function(room, index, array){
            if(room.users.length == 0){
                delete lobby.rooms[index];
            }
        });
    }, 1000 * 60 * 5);

    function tokenize(cmdString, room, user){
        var raw = cmdString.split(' ');
        var proc = cmdString.toLowerCase().split(' ');
        var cmd = proc[0].substr(1);

        socket.get('userID', function(err, userID){
            socket.get('roomID', function(err, roomID){
               if(userID == user.id && roomID == room.id){
                    //authenticated
                    cmdProcessor(cmd, cmdString, proc, raw, room, user);
               }
            })
        })

        
    }

    function resolveDice(diceString){
        diceString = diceString ? diceString : '1d6';

        var dice = diceString.split('d');
        var number = dice[0];
        var face = dice[1];
        var output = {};
        output.rolls = [];
        output.total = 0;

        number = isFinite(number) ? number : 1;
        face = isFinite(face) ? face : 6;

        for(var i = 0; i < number; i++){
            var roll = Math.max(Math.round(Math.random() * face), 1);
            output.rolls.push(roll);
            output.total += roll;
        }

        return output;
    }

    function cmdProcessor(cmd, cmdString, proc, raw, room, user){
        if(!user){
            user = {};
            user.name = "A Ghost";
        }
        switch(cmd){
            case 'roll':
                var output = resolveDice(proc[1]);
                room.say(user.name + ': rolls the dice and gets ' + JSON.stringify(output.rolls) + ' (' + output.total + ').', room.id, 'cmd');
                return true;
            break;
            case 'proll':
                var output = resolveDice(proc[1]);
                user.say('You roll the dice and get ' + JSON.stringify(output.rolls) + ' (' + output.total + ').', room.id, 'cmd');
                user.sayOthers(user.name + ": quietly rolls the dice.", room, 'cmd');
                return true;
            break;
            case 'say':
                room.say(user.name + ': ' + cmdString.substr(5), room.id, 'normal');
                return true;
            break;
            case 'shout':
                room.say(user.name + ': ' + cmdString.substr(5), room.id, 'shout');
                return true;
            break;
            case 'whisper': //fallthrough
            case 'tell':
                room.findByName(proc[1], function(foundUser){
                    foundUser.say(user.name + " whispers: " + cmdString.substr(proc[0].length + proc[1].length + 2), room.id, 'whisper');
                });
                return true;
            break;
            default:
                return false;
            break;
        }
    }

});

//Program Body
process.stdin.resume();
process.stdin.setEncoding('utf8');
 
process.stdin.on('data', function (line) {
    line = line.toString().trim();
    var raw = line.split(' ');
    var proc = line.toLowerCase().split(' ');
    var cmd = proc[0];

    switch(cmd){
        case 'ping':
            console.log('pong');
        break;
        case 'lobby':
            console.log(lobby);
        break;
        case 'announce':
            lobby.announce(line.substr(proc[0].length + 1));
            console.log('Announcement Sent');
        break;
        case 'debug':
            if(proc[1] == 'off'){
                io.set('log level', 1);
                console.log('Debug disabled');
            }else if(proc[1] == 'on'){
                io.set('log level', 3);
                console.log('Debug enabled');
            }
        break;
        case 'help':
            console.log('announce (msg) - announces (msg) to all rooms');
            console.log('debug (on | off) - changes debug text');
            console.log('lobby - outputs lobby');
            console.log('ping - outputs pong');
        break;
        default:
            console.log('Command not recognized.');
        break;
    }
});