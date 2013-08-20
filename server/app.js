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
        this.socket.emit('sayRoom', {user:this.id, room:roomID, text:text, type:type});
    }
}

User.prototype.sayOthers = function(text, room, type){
    if(text && this.socket && room){
        room.users.forEach(function(userS){
            if(userS.id != this.id){
                console.log('::SAY OTHERS::');
                console.log(userS);
                console.log(this.id);
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

        console.log(lobby);
        lobby.rooms.push(temp);
        console.log(lobby);

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
                if(userS.name == user.name){
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

    socket.on('doSay', function(data){
        var room = lobby.fetchRoom(data.roomID, function(room){
            if(room){
                var user = room.findUser(data.sender, function(user){
                    if(user){
                        room.say(user.name + ":" + data.text);
                    }
                });
            }
        });
    });

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
                room.say(user.name + ' rolls the dice and gets ' + JSON.stringify(output.rolls) + ' (' + output.total + ').', room.id, 'cmd');
                return true;
            break;
            case 'proll':
                var output = resolveDice(proc[1]);
                user.say('You roll the dice and get ' + JSON.stringify(output.rolls) + ' (' + output.total + ').', room.id, 'cmd');
                user.sayOthers(user.name + " quietly rolls the dice.", room, 'cmd');
                return true;
            break;
            case 'say':
                room.say(user.name + ' : ' + cmdString.substr(5), room.id, 'normal');
                return true;
            break;
            default:
                return false;
            break;
        }
    }

});