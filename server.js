#!/usr/bin/env node

var queue = [];
var gamestate;
var fightready=0;
var urlarray = [];
var WebSocketServer = require('websocket').server;
var http = require('http');
var receiver=null;
var tetris;
var playCount =0 ;
var player1=null,player2=null;
var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});
 
wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}
function wait(msecs)
{
var start = new Date().getTime();
var cur = start;
while(cur - start < msecs)
{
cur = new Date().getTime();
}
}

function gameover() {
	if(queue.length > 0) {
		player2=queue.pop();
		for(var i=0;i<queue.length;i++) {
			queue[queue.length-i-1].sendUTF('wait@'+(i+1));
		}
		player2.sendUTF('player2');
		wait(3000);
		player1.sendUTF('start');
		player2.sendUTF('start');
					
	}
	else {
		player1.sendUTF('player1');
		player2=null;
	}
}
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept(null, request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
			var strArray=message.utf8Data.split('@');
			console.log(message.utf8Data);
			
			/* 리시버가 보낸 데이터 처리 */
			if(strArray[0] ===  'tetris') {
				switch(strArray[1]) {
					case 'connect' : { 
						console.log('receiver connect');
						player1.sendUTF('ready');
						tetris=connection;
						break;
					}
				
					
				
			  }
			
			}
			if(strArray[0] ===  'receiver') {
				console.log('Request from Receiver');
				if(strArray[1] ==='connect') {
					receiver = connection;
					console.log('Receiver Connection Success !!');
					console.log('Receiver url : ' + receiver.remoteAddress);	
					if(urlarray.length > 0 ) {
						receiver.sendUTF(urlarray[--playCount]);
						playCount+=2;
					}
				}
			
				else if(strArray[1] === 'end'){
					if ( playCount === urlarray.length){
					console.log('!!! - Player Counter initialized - !!!');
					playCount = 0;
					}
					
					if(urlarray.length) {
						receiver.send(urlarray[playCount++]);
					}
					console.log('==========Next Video Loaded==========');
					console.log('Receiver is now playing next Queued URL'+playCount);
				
			
				}
			
				else {
					console.log('Received Duration : ' + message.utf8Data);
					sender.sendUTF(strArray[1]);
				}
          // connection.sendUTF('start');
			}
			
			else if(strArray[0] === 'sender') {
			console.log('Request from Sender');
			//sender가 보낸 메세지 처리//
			switch(strArray[1]) {
				case 'connect' : {
					sender = connection;
					console.log('Sender Connection Success !!');
					console.log('Sender url : ' + sender.remoteAddress);
					break;
				}
				case 'url' :{
					console.log('url and queued');
					strArray[2] = checkURL(strArray[2]);
					console.log(' !!! type check : ' + strArray[2] );
					if(urlarray.length === 0 && receiver !== null) {
						urlarray.push(strArray[2]);
						receiver.send(strArray[2]);
						playCount++;
					}	 
					else {
						console.log('url stored');
						urlarray.push(strArray[2]);
					}
					break;
				}
				case 'quick' :{
					console.log('Quick msg received');
					strArray[2] = checkURL(strArray[2]);
					if(playCount === urlarray.length ){
					
						urlarray.push(strArray[2]);
						if( receiver !== null) {
						receiver.send(strArray[2]);
						}
						playCount = 0;
					}
					else{
						urlarray.push(strArray[2]);
						if( receiver !== null) {
						receiver.send(strArray[2]);
						}
						for(var i = playCount ; i < urlarray.length-1 ; i++)
						{
							var tmp = urlarray[i];
							urlarray[i] = urlarray[urlarray.length-1];
							urlarray[urlarray.length-1] = tmp;
						}
						playCount++;
					}
					break;
					
				}
				case 'Qinfo' : {
					console.log('Queue info request');
					console.log('Queue Length : ' + urlarray.length);
					var n = 0;
					while(n < urlarray.length){
						n++;
						sender.send(urlarray[n-1]);
					}
					console.log('End of Queue Info');
					break;
				}
				case 'empty' : {
					console.log('Queue Empty');
					console.log('Queue Length : ' + urlarray.length);
					while (urlarray.pop()) {}
					console.log('array empty');
					playCount = 0;
					break;
				}
				case 'edit' : {
					while (urlarray.pop()) {}
					//urlarray.splice(0, 1);
					urlarray.push(strArray[2]);
					break;
				}
				default : {
					console.log(message.utf8Data);
					break;
				}	
			}
          }
         
			/*player 접속 처리 */
			else if(strArray[0] === 'player') {
				switch(strArray[1]) {
					case 'connect' : case 'reconnect' :{ 
						receiver.sendUTF('tetris');
						console.log('player connect');
						queue.unshift(connection);
						
						//접속해있는 인원을 검사하여 각상황에맞게 메세지전송
						if(player1 === null) {
							player1=queue.pop();
							player1.sendUTF('player1');
							
						}
						else if(player2 ===null  ) {
							player2=queue.pop();
							player2.sendUTF('player2');
							player1.sendUTF('fight');
							wait(3000);
							player1.sendUTF('start');
							player2.sendUTF('start');
						//	
						}
						else {
							var waitNumber;
							waitNumber=queue.length;
							connection.sendUTF('wait@'+waitNumber);
						}
						break;
					
					}
					case 'start' : {
						tetris.sendUTF('start');
						console.log('Received Message: ' + strArray[1]);
						break;
					}
					case 'start2' : {
						fightready++;
						if(fightready===2) {
							tetris.sendUTF('start2');
							fightready=0;
						}
						break;
					}
					case 'restart' : {
						tetris.sendUTF('restart');
						
						break;
					}
					
				
				}
			}
			/* player1, player22 의 게임데이터 전송 */
			else if(strArray[0] === 'player1'  ) {
				if(strArray[1] === 'gameover' ) {
					player2.sendUTF('gameover');
					tetris.sendUTF(message.utf8Data);
					wait(3000);
					player1=player2;
					player2.sendUTF('player1');
					gameover();
					
				}
				else if(strArray[1] === 'attack' ) {
					if(player2 !==null ) {
					tetris.sendUTF(message.utf8Data);
					player2.sendUTF(strArray[1]+'@'+strArray[2]+'@'+strArray[3]);
					}
				}
				else {
					tetris.sendUTF(message.utf8Data);
				}
			}
			else if(strArray[0] === 'player2'  ) {
				if(strArray[1] === 'gameover' ) {
					player1.sendUTF('gameover');
					tetris.sendUTF(message.utf8Data);
					wait(3000);
					gameover();
				}
				else if(strArray[1] === 'attack' ) {
					if(player1 !==null ) {
					tetris.sendUTF(message.utf8Data);
					player1.sendUTF(strArray[1]+'@'+strArray[2]+'@'+strArray[3]);
					}
				}
				else {
					tetris.sendUTF(message.utf8Data);
				}
			}
			
			
          
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
		/* player1이 연결을 끊을경우 */
		if(player1===connection) {
			player1 = null;
			if(player2 !==null) {
				player2.sendUTF('gameover');
					tetris.sendUTF('player1@gameover');
					wait(3000);
					player1=player2;
					player2.sendUTF('player1');
					gameover();
			}
			else {
				tetris.sendUTF('idle');
			}
		}
		
		/* player2이 연결을 끊을경우 */
		else if(player2===connection) {
			player2 = null;
				player1.sendUTF('gameover');
					tetris.sendUTF('player2@gameover');
					wait(3000);
					gameover();
		}
	
			
		/*대기중인 사람이 연결을 끊을경우 */
		for(var i=0;i<queue.length;i++) {
			if(queue[i] === connection) {
			
				for(var j=i ; j<queue.length; j++ ) {
					queue[j]=queue[j+1];
		
				}	
				queue.pop();
				break;
			}
		}
		for(var i=0;i<queue.length;i++) {
			queue[queue.length-i-1].sendUTF('wait@'+i+1);
		}
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

function checkURL(urlString){

	var uString;

	var youtube = urlString.indexOf('youtube');
	var mp = urlString.indexOf('mp4');
	console.log( '==Check URL function==');
	console.log( ' index of youtube : ' + youtube );
	console.log( ' index of mp4     : ' + mp );
	
	if( youtube=== -1 && mp === -1 ){
		uString = urlString + '#url'
		console.log( ' url : ' + uString );
		return uString;
	}
	else{
		uString = urlString + '#video'
		console.log( 'here?' );
		console.log( ' url : ' + uString );
		return uString;
	}
}