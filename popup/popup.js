document.addEventListener('DOMContentLoaded', function() {

    var port = chrome.runtime.connect({name: "timer"});
    port.postMessage({
        action: "update",
    });

    document.querySelector('#stop').addEventListener('click', function(event) {
        port.postMessage({
            action: "stop",
        });
        document.getElementById('play_pause').setAttribute('name', 'play');
    });
    document.querySelector('#play_pause').addEventListener('click', function(event) {

        if (event.target.getAttribute('name') == 'play') {
            port.postMessage({
                action: "play",
            });
            event.target.setAttribute('name', 'pause');
        } else {
            port.postMessage({
                action: "pause",
            });
            event.target.setAttribute('name', 'play');
        }

    });

    port.onMessage.addListener(function(msg) {

        if (msg.time) {
            document.getElementById('timer').innerHTML = msg.time;
        }

        if (msg.isRunning) {
            document.getElementById('play_pause').setAttribute('name', msg.isRunning ? 'pause' : 'play');
        }

    });

});
