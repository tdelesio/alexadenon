var http = require('http');
var fs = require('fs');
var urllib = require("url");
var Client = require('node-ssdp').Client;
var dgram = require('dgram'); 

//null will cause the server to discover the Roku on startup, hard coding a value will allow for faster startups
// When manually setting this, include the protocol, port, and trailing slash eg:
// var denonAddress = "http://192.168.1.100:8060/";
var denonAddress = http://plex.home.local:8000/; 
var PORT=8000; //this is the port you are enabling forwarding to. Reminder: you are port forwarding your public IP to the computer playing this script...NOT the roku IP

var ssdp = new Client();

//handle the ssdp response when the roku is found
ssdp.on('response', function (headers, statusCode, rinfo) {
	denonAddress = headers.LOCATION;
	console.log("Found Roku: ",denonAddress);
});

//this is called periodically and will only look for the roku if we don't already have an address
function searchForRoku() {
	if (denonAddress == null) {
		ssdp.search('roku:ecp');
	}
}

//a simple wrapper to post to a url with no payload (to send roku commands)
function post(url,callback) {
	var info = urllib.parse(url);
	console.log("Posting: ",url);
    var opt = {
        host:info.hostname,
		port:info.port,
        path: info.path,
        method: 'POST',
    };

    var req = http.request(opt, callback);

    req.end();
}

//Performing an operation on the roku normally takes a handful of button presses
//This function will perform the list of commands in order and if a numerical value is included in the sequence it will be inserted as a delay
function postSequence(sequence,callback) {
	function handler() {
		if (sequence.length == 0) {
			if (callback) callback();
			return;
		}
		var next = sequence.shift();
		if (typeof next === "number") {
			setTimeout(handler,next);
		} else if (typeof next === "string") {
			post(next,function(res) {
                res.on("data",function() {}); //required for the request to go through without error
                handler();
			});
		}
	}
	handler();
}

//In order to send keyboard input to the roku, we use the keyress/Lit_* endpoint which can be any alphanumeric character
//This function turns a string into a series of these commands with delays of 100ms built in
//NOTE: this currently ignores anything that isn't lowercase alpha
function createTypeSequence(text) {
	var sequence = [];
	for (i=0; i<text.length; i++) {
		var c = text.charCodeAt(i); 
		if (c == 32)
			sequence.push(denonAddress+"keypress/Lit_%20");
		else
			sequence.push(denonAddress+"keypress/Lit_"+text.charAt(i));
		sequence.push(100);	
	}
	return sequence;
}
//simple helper function to pull the data out of a post request. This could be avoided by using a more capable library such
function getRequestData(request,callback) {
	var body = "";
	request.on("data",function(data) {
		body += String(data);
	});
	request.on("end",function() {
		callback(body);
	});
}

// //depending on the URL endpoint accessed, we use a different handler.
// //This is almost certainly not the optimal way to build a TCP server, but for our simple example, it is more than sufficient
// var handlers = {
//     //This will play the last searched movie or show, we use it because it consistently resides to the right of the search box
// 	"/roku/playlast":function(request,response) { //NOT WORKING RIGHT NOW - NETFLIX CHANGED, NEEDS MODIFICATION TO APPLY TO ALL APPS
// 		postSequence([
// 			denonAddress+"keypress/home",    //wake the roku up, if its not already
// 			denonAddress+"keypress/home",    //go back to the home screen (even if we're in netflix, we need to reset the interface)
// 			3000,                           //loading the home screen takes a few seconds
// 			denonAddress+"launch/12",        //launch the netflix channel (presumably this is always id 12..)
// 			7000,                           //loading netflix also takes some time
// 			denonAddress+"keypress/down",    //the last searched item is always one click down and one click to the right of where the cursor starts
// 			denonAddress+"keypress/right",
// 			1000,                           //more delays, experimentally tweaked.. can probably be significantly reduced by more tweaking
// 			denonAddress+"keypress/Select",  //select the show from the main menu
// 			3000,                           //give the show splash screen time to load up
// 			denonAddress+"keypress/Play"     //play the current/next episode (whichever one comes up by default)
// 		]);
// 		response.end("OK"); //we provide an OK response before the operation finishes so that our AWS Lambda service doesn't wait around through our delays
// 	}
// }

// //handles and incoming request by calling the appropriate handler based on the URL
// function handleRequest(request, response){
// 	if (handlers[request.url]) {
// 		handlers[request.url](request,response);
// 	} else {
// 		console.log("Unknown request URL: ",request.url);
// 		response.end();
// 	}
// }


// Launches the Amazon Video channel (id 13)
function zone2BlueTooth(address){
 return address+"api/Z2BT";
}
// Launches the Pandora channel (id 28)
function zone2Media(address){
 return address+"api/Z2MPLAY";
}



//start the MSEARCH background task to try every second (run it immediately too)
setInterval(searchForRoku,1000);
searchForRoku();

//start the tcp server
http.createServer(handleRequest).listen(PORT,function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});