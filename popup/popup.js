document.addEventListener('DOMContentLoaded', function() {

    chrome.browserAction.setBadgeBackgroundColor({color: '#9719f0'});
    var port = chrome.runtime.connect({name: "timer"});
    port.postMessage({
        action: "update"
    });
    port.postMessage({
        action: 'checkExtensionUpdate'
    });

    document.querySelector('#stop').addEventListener('click', function(event) {
        port.postMessage({
            action: "stop"
        });
        document.getElementById('play_pause').setAttribute('name', 'play');
    });
    document.querySelector('#play_pause').addEventListener('click', function(event) {

        if (event.target.getAttribute('name') == 'play') {
            port.postMessage({
                action: "play"
            });
            event.target.setAttribute('name', 'pause');
        } else {
            port.postMessage({
                action: "pause"
            });
            event.target.setAttribute('name', 'play');
        }

    });

    port.onMessage.addListener(function(msg) {

        if (msg.time) {
            document.getElementById('timer').innerHTML = msg.time;
        } else if (msg.isRunning) {
            document.getElementById('play_pause').setAttribute('name', msg.isRunning ? 'pause' : 'play');
        } else if (msg.extensionUpdated) {
            showUpdateLink(msg.extensionUpdated);
        }

    });

    function showUpdateLink(version) {
        var a = document.createElement('a');
        var text = "Extension has been upgraded to verions: " + version;
        a.appendChild(document.createTextNode(text)).title = text;
        a.href = "https://markovic-nikola.github.io/kronos/#v" + version.replace('.', '');
        document.getElementById('news').appendChild(a);

        a.addEventListener('click', function(event) {
            chrome.tabs.create({ url: this.href });
        });
    }

});
