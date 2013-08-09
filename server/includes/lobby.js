var Lobby = function(id){
    this.rooms = [ ];
    this.announce = null;
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

if(typeof exports == 'undefined'){
    exports.Lobby = Lobby;
}