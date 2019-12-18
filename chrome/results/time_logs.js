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
                    table.id = key;
                    table.setAttribute('data-value', obj.labels[key].name);
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
                    total_val_td.appendChild(document.createTextNode(timer.formatTime(total) + ' (' + timer.formatToHours(total) + 'h)'));
                    if (time_logs && time_logs[key] && time_logs[key].length) {
                        var delete_link = create_delete_link(key);
                        var download_csv_link = create_download_csv_link(key);
                        total_val_td.appendChild(delete_link);
                        total_val_td.appendChild(download_csv_link);
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
        td_time.appendChild(document.createTextNode(fullTimeFormat(row.time)));
        var delete_link = create_delete_link(label_id, row);
        td_time.appendChild(delete_link);
        tr.appendChild(td_time);
        tbody.appendChild(tr);
    }

    function fullTimeFormat(time) {
        return timer.formatTime(time) + ' (' + timer.formatToHours(time) + 'h)';
    }

    function create_delete_link(label_id, row) {
        var delete_link = document.createElement('A');
        delete_link.setAttribute('href', '#' + label_id);
        delete_link.appendChild(document.createTextNode('x'));
        delete_link.setAttribute('class', 'delete_icon');
        delete_link.setAttribute('title', 'Delete');
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

    function create_download_csv_link(label_id) {
        var link = document.createElement('a');
        link.text = 'CSV';
        link.className = 'download_btn';
        link.setAttribute('title', 'Download as CSV');
        link.setAttribute('href', '#');

        chrome.storage.sync.get('time_logs', function(obj) {
            if (obj.time_logs) {
                if (obj.time_logs[label_id] && obj.time_logs[label_id].length) {
                    var csv_data = [];
                    var total = 0;

                    obj.time_logs[label_id].forEach(function(item) {
                        csv_data.push({
                            'Name': item.name,
                            'Saved at': new Date(item.id).toLocaleString(),
                            'Time': timer.formatTime(item.time),
                            'Hours': timer.formatToHours(item.time)
                        });
                        total += item.time;
                    });

                    csv_data.push({
                        'Name': 'Total',
                        'Saved at': '',
                        'Time': timer.formatTime(total),
                        'Hours': timer.formatToHours(total)
                    });

                    var csv = convertArrayOfObjectsToCSV({
                        data: csv_data,
                        columnDelimiter: ';'
                    });

                    if (csv == null) return;

                    if (!csv.match(/^data:text\/csv/i)) {
                        csv = 'data:text/csv;charset=utf-8,' + csv;
                    }

                    data = encodeURI(csv);
                    link.setAttribute('href', data);
                    link.setAttribute('id', label_id);
                    var filename = (document.getElementById(label_id).getAttribute('data-value')) + '.csv';
                    link.setAttribute('download', filename);
                }
            }
        });

        return link;
    }

    function convertArrayOfObjectsToCSV(args) {
        var result, ctr, keys, columnDelimiter, lineDelimiter, data;
        data = args.data || null;

        if (data == null || !data.length) {
            return null;
        }

        columnDelimiter = args.columnDelimiter || ',';
        lineDelimiter = args.lineDelimiter || '\n';
        keys = Object.keys(data[0]);

        result = '';
        result += keys.join(columnDelimiter);
        result += lineDelimiter;

        data.forEach(function(item) {
            ctr = 0;
            keys.forEach(function(key) {
                if (ctr > 0) result += columnDelimiter;
                result += item[key];
                ctr++;
            });

            result += lineDelimiter;

        });
        return result;
    }

});
