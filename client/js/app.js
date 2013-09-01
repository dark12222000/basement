$(document).foundation();

var socket = io.connect('http://bs1.adventurestory.net:3000');

socket.on('connected', function(event){
	console.log('Connected successfully to socket');
	
	var user = {}; //This is "Me", currently logged in user
	user.cmdLog = [];
	user.cmdLogIndex = -1;
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
		var shareURL = (document.location.hash.length > 0) ? document.URL : document.URL + '#' + room.id;
		$('#socket-room-link').val(shareURL).on('click', function(){
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

			user.cmdLogIndex = -1;
			if(message.toLowerCase().slice(0,4) != '/say') user.cmdLog.unshift(message);
		}
		return false;
	}).on('keyup', function(event){
		switch(event.keyCode){
			case 38: //Up Arrow
				if(user.cmdLogIndex + 1 < user.cmdLog.length) $('[name=socket-message]').val(user.cmdLog[++user.cmdLogIndex]);
			break;
			case 40: //Down Arrow
				if(user.cmdLogIndex - 1 >= 0) $('[name=socket-message]').val(user.cmdLog[--user.cmdLogIndex]);
			break;
		}
		//console.log(user.cmdLogIndex, user.cmdLog.length, user.cmdLog);
	});

	$('#dice .dice').on('click', function(){
		var num = $(this).closest('tr').find('input[type=number]').val();
		var die = $(this).closest('tr').attr('class');
		var roll = '/roll ' + num + die;
		socket.emit('doCmd', { sender: user.id, roomID: room.id, text: roll });
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

		var oldUsers = room.users.slice(0);
		room.users = response.clients.slice(0);

		$.each(room.users, function(index, user) {
			if(index == 0) room.admins.push(user);

			var userType = index == 0 ? 'admin' : 'user';
			$('#socket-users').append('<li class="'+ userType +'" data-tooltip title="Whisper with '+ user +'">'+ user + ' ');
			$('#socket-users li').on('click', function(){
				$('[name=socket-message]').val('/whisper '+ $(this).text());
			});
		});

		if(oldUsers.length == 0) $('#socket-room').append('<p class="notice">Welcome to the dungeon.</p>');
		else {
			if(oldUsers.length < room.users.length) {
				$('#socket-room').append('<p class="notice">New user has joined the dungeon.</p>');
			} else {
				$('#socket-room').append('<p class="notice">User has left the dungeon.</p>');
			}
		}
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
		var userType = $.inArray(username, room.admins) ? 'admin' : 'user';

		theRoom.append('<p><span class="'+ userType +'">' + username + ':</span> <span class="'+ response.type +'">' + message+ '</span></p>');
		
		if(scrollDown) theRoom.scrollTop(theRoom[0].scrollHeight);
		console.log('Room now: ', room);
	});
});