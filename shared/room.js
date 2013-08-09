var Room = function(id){
    this.id = id;
    this.title = null;
    this.admins = [];
    this.users = [];
    this.say = null;
    this.announce = null;
}

if(exports){
    exports.Room = Room;
}