var Room = function(id){
    this.id = id;
    this.title = null;
    this.admins = [];
    this.users = [];
}

if(typeof exports != 'undefined'){
    exports.Room = Room;
}