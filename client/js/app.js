$(document).foundation();

var socket = io.connect('http://bs1.adventurestory.net:3000');

socket.on('connected', function(event){
	console.log('Connected successfully to socket', event);
	
	var room = new Object();
	var user = new Object();
	
	$('#createRoom').foundation('reveal', 'open');
	
	/* UI Binds */
	$('.createRoom').on('click', function(){
		socket.emit('createRoom');
	});
	
	$('form.login').submit(function(){
		socket.emit('registerClient', { name: $(this).find('input[name=name]').val(), roomID: room.id });
		$(this).closest('form').foundation('reveal', 'close');
		return false;
	});
	
	/* Event Binds */
	socket.on('roomCreated', function(response){
		console.log('roomCreated: ', response);
		room.id = response.roomID;
	});
	
	socket.on('clientRegistered', function(response){
		console.log('clientRegistered: ', response);
		user.id = response.userId;
		user.isAdmin = response.admin;
		socket.emit('getClients', { sender: user.id, room: room.id });
	});
	
	socket.on('sendClients', function(response){
		console.log('sendClients: ', response);
		console.log('Connected Clients are: ', response.clients);
	});
});