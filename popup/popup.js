document.addEventListener('DOMContentLoaded', function() {

    var current_time = 0;
    var port = chrome.runtime.connect({name: "timer"});
    port.postMessage({
        action: "update"
    });
    port.postMessage({
        action: 'checkExtensionUpdate'
    });
    port.postMessage({
        action: 'checkTimerLimitReached'
    });

    var manifest = chrome.runtime.getManifest();
    var $stopBtn = document.querySelector('#stop');
    var $playPauseBtn = document.querySelector('#play_pause');

    $stopBtn.addEventListener('click', function(event) {
        port.postMessage({
            action: "stop"
        });
        $playPauseBtn.setAttribute('name', 'play');
        $playPauseBtn.disabled = false;
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
            document.getElementById('timer').innerHTML = '';
            document.getElementById('timer').appendChild(document.createTextNode(msg.time));
        }

        if (msg.isRunning !== null && typeof msg.isRunning !== 'undefined') {
            document.getElementById('play_pause').setAttribute('name', msg.isRunning ? 'pause' : 'play'); // toggle play pause icon/btn
        }

        if (msg.timeRaw !== null && typeof msg.timeRaw !== 'undefined') {
            if (msg.timeRaw > 0) {
                document.getElementById('save_time').disabled = false;
            } else {
                document.getElementById('save_time').disabled = true;
                document.getElementById('save_time_input').style.display = 'none';
            }
            current_time = msg.timeRaw;
        }

        if (msg.extensionUpdated) {
            showUpdateLink(msg.extensionUpdated);
        }

        if (msg.timerLimitReached !== null && typeof msg.timerLimitReached !== 'undefined') {
            $playPauseBtn.disabled = msg.timerLimitReached;
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

    document.getElementById('save_time').addEventListener('click', function(event) {
        var $input = document.getElementById('save_time_input');
        if (!$input.style.display || $input.style.display == 'none') {
            $input.style.display = 'block';
        } else {
            $input.style.display = 'none';
        }
    });

    // print labels
    chrome.storage.sync.get('labels', function(obj) {
        var ul = document.querySelector('#save_time_input .sublist');
        if (!obj.labels || Object.keys(obj.labels).length == 0) {
            var li = document.createElement('LI');
            li.setAttribute('class', 'text-danger');
            var options_link = document.createElement('A');
            options_link.appendChild(document.createTextNode('Empty! Add labels.'));
            options_link.href = '#';
            options_link.addEventListener('click', function(event) {
                chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
            });
            li.appendChild(options_link);
            li.style.textAlign = 'center';
            ul.appendChild(li);
        } else {
            for (key in obj.labels) {
                var li = document.createElement('LI');
                var checkbox = document.createElement('INPUT');
                checkbox.setAttribute('name', 'label_color');
                checkbox.setAttribute('type', 'radio');
                checkbox.id = checkbox.value = key;
                li.appendChild(checkbox);

                var label = document.createElement('LABEL');
                label.setAttribute('for', key);
                var span = document.createElement('SPAN');
                span.setAttribute('class', 'label_color');
                span.style.background = obj.labels[key].color;
                label.appendChild(span);
                label.appendChild(document.createTextNode(obj.labels[key].name));

                li.appendChild(label);
                ul.appendChild(li);
            }
        }
    });

    // save time log
    document.getElementById('save_time_btn').addEventListener('click', function(event) {
        var id = new Date().valueOf();
        var $name = this.parentNode.querySelector('input[name="save_time_input"]');
        var name = $name.value;
        var label = this.parentNode.querySelector('input[name="label_color"]:checked') ? this.parentNode.querySelector('input[name="label_color"]:checked').value : null;
        var $error_msg = document.getElementById('save_time_error');
        $error_msg.innerHTML = '';

        if (!label) {
            $error_msg.appendChild(document.createTextNode('Label is not selected.'));
        } else if (!name) {
            $error_msg.appendChild(document.createTextNode('Name is empty.'));
            return;
        } else if (name.length > 100) {
            $error_msg.appendChild(document.createTextNode('Name is too long, maximum characters: 100.'));
            return;
        } else {
            document.getElementById('save_time_btn').disabled = true;
            chrome.storage.sync.get('time_logs', function(obj) {
                if (!obj.time_logs) {
                    obj.time_logs = {};
                }
                var new_log = {
                    id: id,
                    name: name,
                    time: current_time
                };
                if (!obj.time_logs[label]) {
                    obj.time_logs[label] = [new_log];
                } else {
                    obj.time_logs[label].push(new_log);
                }
                chrome.storage.sync.set(obj, function() {
                    port.postMessage({
                        action: "stop"
                    });
                    document.getElementById('save_time_btn').disabled = false;
                    $name.value = '';
                });
            });
        }

    });

    document.getElementById('results').addEventListener('click', function(event) {
        chrome.tabs.create({ url: 'results/time_logs.html' });
    });

});
