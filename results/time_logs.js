document.querySelector('title').appendChild(document.createTextNode(chrome.runtime.getManifest().name + ' - Time logs'));
document.addEventListener('DOMContentLoaded', function() {

    var time_logs;
    var timer = chrome.extension.getBackgroundPage().timer; // shortcut for formatting time
    chrome.storage.sync.get('time_logs', function(obj) {
        if (obj.time_logs) {
            time_logs = obj.time_logs;
        }

        chrome.storage.sync.get('labels', function(obj) {
            if (obj.labels) {
                var container = document.getElementById('container');
                for (key in obj.labels) {
                    var h2 = document.createElement('H2');
                    h2.appendChild(document.createTextNode('Label: ' + obj.labels[key].name));
                    h2.style.color = obj.labels[key].color;
                    container.appendChild(h2);

                    var table = init_table(obj.labels[key].color);
                    var tbody = table.querySelector('tbody');
                    container.appendChild(table);
                    var total = 0;
                    if (time_logs && time_logs[key]) {
                        time_logs[key].forEach(function(item) {
                            create_tbody(item, tbody, key);
                            total += item.time;
                        });
                    }
                    var total_tr = document.createElement('TR');
                    total_tr.setAttribute('class', 'total');
                    var total_text_td = document.createElement('TD');
                    total_text_td.setAttribute('colspan', 2);
                    total_text_td.appendChild(document.createTextNode('Total'));
                    total_tr.appendChild(total_text_td);
                    var total_val_td = document.createElement('TD');
                    total_val_td.appendChild(document.createTextNode(timer.formatTime(total) + ' (' + timer.formatHumanTime(total) + ')'));
                    if (time_logs && time_logs[key] && time_logs[key].length) {
                        var delete_link = create_delete_link(key);
                        total_val_td.appendChild(delete_link);
                    }
                    total_tr.appendChild(total_val_td);
                    tbody.appendChild(total_tr);
                }
            }
        });
    });

    function init_table(color) {
        var table = document.createElement('TABLE');
        var thead = document.createElement('THEAD');
        var tr_head = document.createElement('TR');
        var th_label = document.createElement('TH');
        th_label.style.background = color;
        var th_date = document.createElement('TH');
        th_date.style.background = color;
        var th_time = document.createElement('TH');
        th_time.style.background = color;
        th_label.appendChild(document.createTextNode('Name'));
        th_date.appendChild(document.createTextNode('Saved at'));
        th_time.appendChild(document.createTextNode('Time spent'));
        tr_head.appendChild(th_label);
        tr_head.appendChild(th_date)
        tr_head.appendChild(th_time);
        thead.appendChild(tr_head);
        table.appendChild(thead);
        var tbody = document.createElement('TBODY');
        table.appendChild(tbody);

        return table;
    }

    function create_tbody(row, tbody, label_id) {
        var tr = document.createElement('TR');
        tr.id = label_id;
        var td_name = document.createElement('TD');
        td_name.appendChild(document.createTextNode(row.name));
        tr.appendChild(td_name);
        var td_date = document.createElement('TD');
        td_date.appendChild(document.createTextNode(new Date(row.id).toLocaleString()));
        tr.appendChild(td_date);
        var td_time = document.createElement('TD');
        td_time.appendChild(document.createTextNode(timer.formatTime(row.time) + ' (' + timer.formatHumanTime(row.time) + ')'));
        var delete_link = create_delete_link(label_id, row);
        td_time.appendChild(delete_link);
        tr.appendChild(td_time);
        tbody.appendChild(tr);
    }

    function create_delete_link(label_id, row) {
        var delete_link = document.createElement('A');
        delete_link.setAttribute('href', '#' + label_id);
        delete_link.appendChild(document.createTextNode('x'));
        delete_link.setAttribute('class', 'delete_icon');
        if (row) {
            delete_link.setAttribute('data-value', row.id);
        }
        delete_link.addEventListener('click', function(event) {
            chrome.storage.sync.get('time_logs', function(obj) {
                if (obj.time_logs) {
                    if (obj.time_logs[label_id] && obj.time_logs[label_id].length) {
                        if (row) {
                            // remove one log from label
                            obj.time_logs[label_id].forEach(function(item, index, arr) {
                                if (item.id == row.id) {
                                    arr.splice(index, 1);
                                }
                            });
                        } else {
                            // remove all logs from label
                            obj.time_logs[label_id] = [];
                        }
                        chrome.storage.sync.set(obj, function() {
                            location.reload();
                        });
                    }
                }
            });
        });

        return delete_link;
    }

});
