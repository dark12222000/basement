var User = function(id){
    this.id = id;
    this.name = null;
    this.admin = false;
    this.socket = false;
}

if(typeof exports == 'undefined'){
    exports.User = User;
}