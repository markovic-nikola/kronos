document.querySelector('title').appendChild(document.createTextNode(chrome.runtime.getManifest().name + ' - Options'));
document.addEventListener('DOMContentLoaded', function() {

    // on load populate options from storage
    document.querySelectorAll('.option').forEach(function(element) {
        var name = element.getAttribute('name');
        chrome.storage.sync.get(name, function(obj) {
            if (obj[name]) {
                element.value = obj[name];
            }
        });
    });

    document.getElementById('sound').addEventListener('change', function(event) {
        chrome.storage.sync.set({'sound_option': this.value});
    });

    document.getElementById('sound_btn').addEventListener('click', function(event) {
        var audio = new Audio();
        var value = document.getElementById('sound').value;
        audio.src = "/assets/" + value + ".mp3";
        audio.play();
    });

    document.getElementById('reset_btn').addEventListener('click', function(event) {
        chrome.storage.sync.clear(function() {
            location.reload();
        });
    });

    document.getElementById('add_label').addEventListener('click', function(event) {
        if (!is_label_rows_max()) {
            create_label_row_inputs();
        }
    });

    // used for generating input row for saving label
    function create_label_row_inputs() {

        // create row
        var container = document.getElementById('labels');
        var row = create_label_row();
        // create name input
        var input = document.createElement("INPUT");
        input.setAttribute('type', 'text');
        input.setAttribute('name', 'label_name');
        input.setAttribute('placeholder', 'Name');
        row.appendChild(input);

        // create color select
        var select = document.createElement('SELECT');
        select.setAttribute('class', 'ml15');
        select.setAttribute('name', 'label_color');
        var colors = {
            blue: '#3498db',
            red: '#e74c3c',
            green: '#2ecc71',
            orange: '#f39c12',
            purple: '#9b59b6'
        };
        for (var key in colors) {
            var option = document.createElement('OPTION');
            option.text = key;
            option.value = colors[key];
            option.style.background = colors[key];
            select.appendChild(option);
        }
        row.appendChild(select);

        // create save button
        var btn = document.createElement('BUTTON');
        btn.appendChild(document.createTextNode('Save'));
        btn.setAttribute('class', 'ml15 save_label_btn');
        btn.addEventListener('click', function(event) {
            var id = new Date().valueOf();
            var values = {};
            values = {
                name: input.value,
                color: select.value,
            };
            // validation
            if (!values.name) {
                row.querySelector('.text-danger').appendChild(document.createTextNode('Empty name'));
                return;
            }
            if (!values.color || !Object.values(colors).includes(values.color)) {
                row.querySelector('.text-danger').appendChild(document.createTextNode('Invalid color'));
                return;
            }
            // save
            chrome.storage.sync.get('labels', function(obj){
                if (!obj.labels) {
                    obj.labels = {};
                }
                obj.labels[id] = values;
                chrome.storage.sync.set(obj);
                row.parentNode.removeChild(row);
                get_label_row(values, id);
            });
        });
        row.appendChild(btn);

        // create error message placeholder
        var error_msg = document.createElement('P');
        error_msg.setAttribute('class', 'text-danger');
        row.appendChild(error_msg);

        container.appendChild(row);
        input.focus();
    };

    // create just label row
    function create_label_row() {
        var row = document.createElement('DIV');
        row.setAttribute('class', 'label_row mt15');

        return row;
    }

    // generate already saved label row
    function get_label_row(values, id) {
        var row = create_label_row();
        var name = document.createElement('STRONG');
        name.appendChild(document.createTextNode(values.name));
        row.appendChild(name);

        var color = document.createElement('SPAN');
        color.style.background = values.color;
        color.setAttribute('class', 'color_label ml15');
        row.appendChild(color);

        var delete_link = document.createElement('A');
        delete_link.href = '#';
        delete_link.appendChild(document.createTextNode('Delete'));
        delete_link.setAttribute('class', 'text-danger ml15');
        delete_link.setAttribute('data-value', id);
        delete_link.addEventListener('click', function(event) {
            var id = this.getAttribute('data-value');
            chrome.storage.sync.get('labels', function(obj){
                if (obj.labels) {
                    delete obj.labels[id];
                }
                chrome.storage.sync.set(obj, function() {
                    row.parentNode.removeChild(row);
                });
                chrome.storage.sync.get('time_logs', function(object) {
                    delete object.time_logs[id];
                    chrome.storage.sync.set(object);
                });
            });
        });
        row.appendChild(delete_link);
        document.getElementById('labels').appendChild(row);

    }

    chrome.storage.sync.get('labels', function(obj) {
        if (obj.labels) {
            for (key in obj.labels) {
                get_label_row(obj.labels[key], key);
            }
        }
    });

    function debug_storage() {
        chrome.storage.sync.get(function(result){
            console.log(result);
        });
    }

    function is_label_rows_max() {
        const max_labels = 5;
        return document.querySelectorAll('.label_row').length >= max_labels;
    }

    document.getElementById('time_limit').addEventListener('change', function(event) {
        chrome.storage.sync.set({'time_limit_option': parseFloat(this.value)});
    });

    document.getElementById('idle').addEventListener('change', function(event) {
        chrome.storage.sync.set({'idle': parseFloat(this.value)});
    });

});
