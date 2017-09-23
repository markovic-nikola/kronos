document.addEventListener('DOMContentLoaded', function() {

    var port = chrome.runtime.connect({name: "timer"});
    port.postMessage({
        action: "update"
    });
    port.postMessage({
        action: 'checkExtensionUpdate'
    });

    chrome.browserAction.setBadgeBackgroundColor({color: '#9719f0'});chrome.browserAction.setBadgeBackgroundColor({color: '#9719f0'});
    var manifest = chrome.runtime.getManifest();
    var $stopBtn = document.querySelector('#stop');
    var $playPauseBtn = document.querySelector('#play_pause');

    $stopBtn.addEventListener('click', function(event) {
        port.postMessage({
            action: "stop"
        });
        document.getElementById('play_pause').setAttribute('name', 'play');
    });
    $stopBtn.setAttribute('title', manifest.commands.stop.suggested_key.default);

    $playPauseBtn.addEventListener('click', function(event) {

        if (event.target.getAttribute('name') == 'play') {
            port.postMessage({
                action: "play"
            });
        } else {
            port.postMessage({
                action: "pause"
            });
        }

    });
    $playPauseBtn.setAttribute('title', manifest.commands.play_pause.suggested_key.default);

    port.onMessage.addListener(function(msg) {

        if (msg.time) {
            document.getElementById('timer').innerHTML = msg.time;
        }

        if (msg.isRunning !== null) {
            document.getElementById('play_pause').setAttribute('name', msg.isRunning ? 'pause' : 'play'); // toggle play pause icon/btn
        }

        if (msg.extensionUpdated) {
            showUpdateLink(msg.extensionUpdated);
        }

    });

    function showUpdateLink(version) {
        var a = document.createElement('a');
        var text = "Extension has been upgraded to version: " + version;
        a.appendChild(document.createTextNode(text)).title = text;
        a.href = "https://markovic-nikola.github.io/kronos/#v" + version.replace('.', '');
        document.getElementById('news').appendChild(a);

        a.addEventListener('click', function(event) {
            chrome.tabs.create({ url: this.href });
        });
    }

});
