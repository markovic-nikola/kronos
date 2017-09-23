var Timer = function() {

	var that = this;
    this.time = 0,
	this.interval = null,
    this.running = false,
    this.port = null,
	this.audio = null,
	this.extensionUpdated = null,

	this.setTime = function(time) {
		that.time = time;
		that.update();
	},

	this.play = function() {

        if (that.isRunning()) {
            return;
        }

        that.setTime(that.time);
		that.interval = setInterval(function() {
			that.time++;
			that.setTime(that.time);
		}, 1000);
        that.setRunning(true);
	},

    this.update = function() {

		that.sendMessage({
			time: that.getCurrentFormattedTime(),
			isRunning: that.isRunning()
		});

		that.playReminderSound();
		that.saveTime(that.time);

		if (that.time > 0) {
			chrome.browserAction.setBadgeText({text: that.formatCurrentHumanTime()});
		}

    },

	this.formatTime = function(time) {
		var times = {
			hours: Math.floor(time / 60 / 60)
		};
		times.hoursInSeconds = times.hours * 60 * 60;
		times.minutes = Math.floor((time - times.hoursInSeconds) / 60);
		times.minutesInSeconds = times.minutes * 60;
		times.seconds = Math.floor(time - (times.hoursInSeconds + times.minutesInSeconds));

		function twoDigitFormat(value) {
			return ('0' + value).slice(-2);
		}

		return twoDigitFormat(times.hours) + ':' + twoDigitFormat(times.minutes) + ':' + twoDigitFormat(times.seconds);
	},

    this.getCurrentFormattedTime = function(time) {
        return that.formatTime(that.time);
    },

	this.formatHumanTime = function(time) {
		if (time >= 3600) {
			var hours = that.round(time / 3600);
			return hours + ' h';
		} else if (time >= 60) {
			var minutes = that.round(time / 60);
			return minutes + ' m';
		} else {
			return time + ' s';
		}

		return time;
	},

	this.formatCurrentHumanTime = function() {
		return that.formatHumanTime(that.time);
	},

	this.pause = function() {
		clearInterval(that.interval);
        that.setRunning(false);
        that.update();
	},

	this.stop = function() {
		that.pause();
		that.setTime(0);
		chrome.browserAction.setBadgeText({text: ''});
		chrome.storage.sync.remove('time');
	},

    this.setRunning = function(value) {
        that.running = value;
    },

	this.isRunning = function() {
		return that.running;
	},

    this.saveTime = function(time, strict) {
		// if it's not strict saving then save every 3 seconds -> escape quota limit
		if (strict || time % 3 == 0) {
			chrome.storage.sync.set({'time': time});
		}
    },

	this.round = function(value) {
		if (value >= 10) {
			return Math.round(value);
		} else {
		return value.toFixed(1);
		}
	},

	this.syncInitialTime = function() {
		chrome.storage.sync.get('time', function(obj) {
			if (obj.time) {
				that.setTime(obj.time);
			}
			that.update();
		});
	},

	this.playReminderSound = function() {
		if (that.time === 1800 || (that.time % 3600 === 0 && that.time !== 0)) {
			chrome.storage.sync.get('sound_option', function(obj) {
				that.audio = new Audio();
			    that.audio.src = "/assets/" + (obj.sound_option ? obj.sound_option : "beep") + ".mp3";
				that.audio.play();
			});
		}
	},

	this.sendMessage = function(obj) {
		if (that.port) {
			that.port.postMessage(obj);
		}
	},

	this.checkExtensionUpdate = function() {
		that.sendMessage({
			extensionUpdated: that.extensionUpdated
		})
	}

	// init channel connection with popup
    chrome.runtime.onConnect.addListener(function(port) {
        that.port = port;
        port.onMessage.addListener(function(msg) {

			var callable_actions = ['play', 'pause', 'stop', 'update', 'checkExtensionUpdate'];
			if (msg.action && callable_actions.includes(msg.action)) {
				that[msg.action]();
			}

		});

        port.onDisconnect.addListener(function() {
            that.port = null;
        });
    });

	// first run after install/update
	chrome.runtime.onInstalled.addListener(function(details){
	    if (details.reason == "install") {} else if (details.reason == "update") {
			that.extensionUpdated = chrome.runtime.getManifest().version;
			chrome.browserAction.setBadgeBackgroundColor({color: '#e74c3c'});
			chrome.browserAction.setBadgeText({text: 'New'});
	    }
	});

	// keyboard shortcuts
	chrome.commands.onCommand.addListener(function(command) {
	    if (command == 'play_pause') {
			that.isRunning() ? that.pause() : that.play();
		} else if (command == 'stop') {
			that.stop();
		}
	});

	chrome.browserAction.setBadgeBackgroundColor({color: '#9719f0'});
	this.syncInitialTime();

}

var timer = new Timer();
