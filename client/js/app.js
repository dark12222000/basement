$(document).foundation();

var socket = io.connect('http://bs1.adventurestory.net:3000');

socket.on('connected', function(event){
	console.log('Connected successfully to socket');
	
	var user = {}; //This is "Me", currently logged in user
	var room = new Room(document.location.hash.substr(1));
	
	/* Foundation Events */
	if(room.id) $('#registerClient').foundation('reveal', 'open', { closeOnBackgroundClick: false });
	else $('#createRoom').foundation('reveal', 'open', { closeOnBackgroundClick: false });
	
	/* UI Binds */
	$('.createRoom').on('click', function(){
		socket.emit('createRoom');
	});
	
	$('form.login input[name=name]').on('keydown', function(){
		input = $(this);
		setTimeout(function(){
			if(input.val().length > 0) input.parent().find('input[type=submit]').removeAttr('disabled');
			else input.parent().find('input[type=submit]').attr('disabled', 'disabled');
		}, 100);
	});

	$('form.login').submit(function(){
		user.name = $(this).find('input[name=name]').val();
		socket.emit('registerClient', { name: user.name, roomID: room.id });
		$(this).closest('form').foundation('reveal', 'close');
		$('#socket-room-link').val(document.URL + '#' + room.id).on('click', function(){
			$(this).select();
		});
		$('body').addClass('loggedIn');
		return false;
	});
	
	$('form#socket-chatbox').submit(function(){
		var message = $(this).find('[name=socket-message]').val();
		$(this).find('[name=socket-message]').val('');
		
		if(message){
			if(message.charAt(0) != '/') message = '/say ' + message;
			console.log('Message: ', message);
			socket.emit('doCmd', { sender: user.id, roomID: room.id, text: message });
		}
		return false;
	});
	
	/* Event Binds */
	socket.on('roomCreated', function(response){
		console.log('roomCreated: ', response);
		room.id = response.roomID;
	});
	
	socket.on('clientRegistered', function(response){ //Registered "Me"
		console.log('clientRegistered: ', response);
		user.id = response.userID;
		user.isAdmin = response.admin;
	});
	
	socket.on('sendClients', function(response){
		console.log('sendClients: ', response);
		$('#socket-users').html('');
		$.each(response.clients, function(index, user) {
			room.users.push(user);
			if(index == 0) room.admins.push(user);

			var userType = index == 0 ? 'admin' : 'user';
			$('#socket-users').append('<li class="'+ userType +'" title="Whisper with '+ user +'">'+ user);
			$('#socket-users li').on('click', function(){
				$('[name=socket-message]').val('/whisper '+ $(this).text());
			});
		});
		$('#socket-room').append('<p>You are connected to room ' + room.id + '</p>');
	});
	
	socket.on('updateClients', function(response){
		socket.emit('getClients', { sender: user.ID, roomID: room.id });
	});
	
	socket.on('say', function(response){
		var theRoom = $('#socket-room');
		if(theRoom[0].scrollHeight - theRoom.outerHeight() < theRoom.scrollTop())
			var scrollDown = true;
		
		var username = response.text.split(':', 1)[0];
		var message = response.text.substring(username.length + 1, response.text.length);
		var userType = username == room.admins[0] ? 'admin' : 'user';

		theRoom.append('<p><span class="'+ userType +'">' + username + ':</span> <span class="'+ response.type +'">' + message+ '</span></p>');
		
		if(scrollDown) theRoom.scrollTop(theRoom[0].scrollHeight);
		console.log('Room now: ', room);
	});
});