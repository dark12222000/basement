$(document).foundation();

var socket = io.connect('http://bs1.adventurestory.net:3000');

socket.on('connected', function(event){
	console.log('Connected successfully to socket');
	
	var user = {};
	var room = { id: document.location.hash.substr(1) };
	
	if(room.id) $('#registerClient').foundation('reveal', 'open');
	else $('#createRoom').foundation('reveal', 'open');
	
	/* UI Binds */
	$('.createRoom').on('click', function(){
		socket.emit('createRoom');
	});
	
	$('form.login').submit(function(){
		socket.emit('registerClient', { name: $(this).find('input[name=name]').val(), roomID: room.id });
		$(this).closest('form').foundation('reveal', 'close');
		return false;
	});
	
	$('form#socket-chatbox').submit(function(){
		socket.emit('doSay', { sender: user.id, roomID: room.id, text: $(this).find('[name=socket-message]').val() });
		$(this).find('[name=socket-message]').val('');
		return false;
	});
	
	/* Event Binds */
	socket.on('roomCreated', function(response){
		console.log('roomCreated: ', response);
		room.id = response.roomID;
	});
	
	socket.on('clientRegistered', function(response){
		console.log('clientRegistered: ', response);
		user.id = response.userID;
		user.isAdmin = response.admin;
		$('#socket-connected').fadeIn()
			.find('#socket-url').val(document.location.pathname + '#' + room.id)
			.on('click', function(){ this.select(); }
		);
		socket.emit('getClients', { sender: user.ID, roomID: room.id });
	});
	
	socket.on('sendClients', function(response){
		console.log('sendClients: ', response);
		console.log('Connected Clients are: ', response.clients);
		$('#socket-users').html('');
		$.each(response.clients, function(index, user) {
			$('#socket-users').append('<li>'+user);
		});
		$('#socket-room').text('You are connected to room ' + room.id);
	});
	
	socket.on('sayRoom', function(response){
		var theRoom = $('#socket-room');
		if(theRoom[0].scrollHeight - theRoom.outerHeight() < theRoom.scrollTop())
			var scrollDown = true;
		
		theRoom.prepend('<p>' + response.text + '</p>');
		
		if(scrollDown) theRoom.scrollTop(theRoom[0].scrollHeight);
	});
	
	window.onbeforeunload = function(){
		//return "test"; // Unregister the user if we can
	}
});