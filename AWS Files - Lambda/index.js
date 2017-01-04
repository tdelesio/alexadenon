var APP_ID = "amzn1.ask.skill.c528e001-94ef-4481-821f-befeafd45fba"; //replace this with your app ID to make use of APP_ID verification

var AlexaSkill = require("./AlexaSkill");
var serverinfo = require("./serverinfo");
var http = require("http");

if (serverinfo.host == "127.0.0.1") {
    throw "Default hostname found, edit your serverinfo.js file to include your server's external IP address";
}

var AlexaDenon = function () {
    AlexaSkill.call(this, APP_ID);
};

AlexaDenon.prototype = Object.create(AlexaSkill.prototype);
AlexaDenon.prototype.constructor = AlexaDenon;

function sendCommand(path,body,callback) {
    var opt = {
        host:serverinfo.host,
		port:serverinfo.port,
        path: path,
        method: 'GET',
    };

    var req = http.request(opt, function(res) {
		callback();
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });

	if (body) req.write(body);
    req.end();
}

AlexaDenon.prototype.intentHandlers = {
    BlueTooth: function (intent, session, response) {
		sendCommand("/api/Z2BT",null,function() {
			response.tellWithCard("Switching Zone two to blue tooth");
		});
    },
    Media: function (intent, session, response) {
		sendCommand("/api/Z2MPLAY",null,function() {
			response.tellWithCard("Switching Zone two to the shield");
		});
    }
    
};

exports.handler = function (event, context) {
    var roku = new AlexaDenon();
    roku.execute(event, context);
};