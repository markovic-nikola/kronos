import { formatTime, formatToHours } from "../helpers.js";

document
	.querySelector("title")
	.appendChild(
		document.createTextNode(chrome.runtime.getManifest().name + " - Time logs"),
	);
document.addEventListener("DOMContentLoaded", function () {
	var time_logs;
	chrome.storage.sync.get("time_logs", function (obj) {
		if (obj.time_logs) {
			time_logs = obj.time_logs;
		}

		chrome.storage.sync.get("labels", function (obj) {
			if (obj.labels) {
				var container = document.getElementById("container");
				for (const key in obj.labels) {
					var h2 = document.createElement("H2");
					h2.appendChild(
						document.createTextNode("Label: " + obj.labels[key].name),
					);
					h2.style.color = obj.labels[key].color;
					container.appendChild(h2);

					var table = init_table(obj.labels[key]);
					table.id = key;
					table.setAttribute("data-value", obj.labels[key].name);
					var tbody = table.querySelector("tbody");
					container.appendChild(table);
					var total = 0;
					if (time_logs && time_logs[key]) {
						time_logs[key].forEach(function (item) {
							create_tbody(item, tbody, key, obj.labels[key]);
							total += item.time;
						});
					}
					var total_tr = document.createElement("TR");
					total_tr.setAttribute("class", "total");
					var total_text_td = document.createElement("TD");
					total_text_td.setAttribute("colspan", 2);
					total_text_td.appendChild(document.createTextNode("Total"));
					total_tr.appendChild(total_text_td);
					var total_val_td = document.createElement("TD");
					let total_value = `${formatTime(total)} (${formatToHours(total)}h)`;
					total_val_td.appendChild(document.createTextNode(total_value));
					total_tr.appendChild(total_val_td);

					if (obj.labels[key].rate) {
						let price = obj.labels[key].rate * parseFloat(formatToHours(total));
						let price_el = document.createElement("TD");
						price_el.appendChild(
							document.createTextNode(`${price.toFixed(2)}`),
						);
						total_tr.appendChild(price_el);
					}
					var td_actions = document.createElement("TD");
					if (time_logs && time_logs[key] && time_logs[key].length) {
						var delete_link = create_delete_link(key);
						var download_csv_link = create_download_csv_link(
							key,
							obj.labels[key],
						);
						td_actions.appendChild(delete_link);
						td_actions.appendChild(download_csv_link);
					}
					total_tr.appendChild(td_actions);

					tbody.appendChild(total_tr);
				}
			}
		});
	});

	function init_table(client) {
		var table = document.createElement("TABLE");
		var thead = document.createElement("THEAD");
		var tr_head = document.createElement("TR");
		var th_label = document.createElement("TH");
		th_label.style.background = client.color;
		var th_date = document.createElement("TH");
		th_date.style.background = client.color;
		var th_time = document.createElement("TH");
		th_time.style.background = client.color;

		th_label.appendChild(document.createTextNode("Name"));
		th_date.appendChild(document.createTextNode("Saved at"));
		th_time.appendChild(document.createTextNode("Time spent"));

		tr_head.appendChild(th_label);
		tr_head.appendChild(th_date);
		tr_head.appendChild(th_time);

		if (client.rate) {
			var th_rate = document.createElement("TH");
			th_rate.style.background = client.color;
			th_rate.appendChild(document.createTextNode("Price"));
			tr_head.appendChild(th_rate);
		}

		var th_actions = document.createElement("TH");
		th_actions.style.background = client.color;
		th_actions.appendChild(document.createTextNode("Actions"));
		tr_head.appendChild(th_actions);

		thead.appendChild(tr_head);
		table.appendChild(thead);
		var tbody = document.createElement("TBODY");
		table.appendChild(tbody);

		return table;
	}

	function create_tbody(row, tbody, label_id, labelClient) {
		var tr = document.createElement("TR");
		tr.id = label_id;
		var td_name = document.createElement("TD");
		td_name.appendChild(document.createTextNode(row.name));
		tr.appendChild(td_name);
		var td_date = document.createElement("TD");
		td_date.appendChild(
			document.createTextNode(new Date(row.id).toLocaleString()),
		);
		tr.appendChild(td_date);
		var td_time = document.createElement("TD");
		td_time.appendChild(document.createTextNode(fullTimeFormat(row.time)));
		tr.appendChild(td_time);

		if (labelClient.rate) {
			let price = labelClient.rate * parseFloat(formatToHours(row.time));
			var td_price = document.createElement("TD");
			td_price.appendChild(document.createTextNode(`${price.toFixed(2)}`));
			tr.appendChild(td_price);
		}

		var td_actions = document.createElement("TD");
		var edit_btn = create_edit_btn(label_id, row);
		td_actions.appendChild(edit_btn);
		var delete_link = create_delete_link(label_id, row);
		td_actions.appendChild(delete_link);
		tr.appendChild(td_actions);
		tbody.appendChild(tr);
	}

	function fullTimeFormat(time) {
		return formatTime(time) + " (" + formatToHours(time) + "h)";
	}

	function create_delete_link(label_id, row) {
		var delete_link = document.createElement("A");
		delete_link.setAttribute("href", "#" + label_id);
		delete_link.appendChild(document.createTextNode("x"));
		delete_link.setAttribute("class", "delete_icon");
		delete_link.setAttribute("title", "Delete");
		if (row) {
			delete_link.setAttribute("data-value", row.id);
		}
		delete_link.addEventListener("click", function (event) {
			chrome.storage.sync.get("time_logs", function (obj) {
				if (obj.time_logs) {
					if (obj.time_logs[label_id] && obj.time_logs[label_id].length) {
						if (row) {
							// remove one log from label
							obj.time_logs[label_id].forEach(function (item, index, arr) {
								if (item.id == row.id) {
									arr.splice(index, 1);
								}
							});
						} else {
							// remove all logs from label
							obj.time_logs[label_id] = [];
						}
						chrome.storage.sync.set(obj, function () {
							location.reload();
						});
					}
				}
			});
		});

		return delete_link;
	}

	function create_edit_btn(label_id, row) {
		var btn = document.createElement("A");
		btn.setAttribute("href", "#" + label_id);
		btn.innerHTML = `<svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
										  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"></path>
										</svg>`;
		btn.setAttribute("class", "edit_icon");
		btn.setAttribute("title", "Edit");
		if (row) {
			btn.setAttribute("data-value", row.id);
		}
		btn.addEventListener("click", function (event) {
			event.preventDefault();
			openEditDialog();

			chrome.storage.sync.get("time_logs", function (obj) {
				if (obj.time_logs) {
					if (obj.time_logs[label_id] && obj.time_logs[label_id].length) {
						if (row) {
							obj.time_logs[label_id].forEach(function (item, index, arr) {
								if (item.id == row.id) {
									let time = formatTime(row.time).split(":");
									let dialog = document.getElementById("edit_entry_dialog");
									dialog.querySelector("input[name=name]").value = row.name;
									dialog.querySelector("input[name=row_id]").value = row.id;
									dialog.querySelector("input[name=label_id]").value = label_id;
									dialog.querySelector("input[name=hours]").value = parseInt(
										time[0],
									);
									dialog.querySelector("input[name=minutes]").value = parseInt(
										time[1],
									);
									dialog.querySelector("input[name=seconds]").value = parseInt(
										time[2],
									);
								}
							});
						}
					}
				}
			});
		});

		return btn;
	}

	function create_download_csv_link(label_id, client) {
		var link = document.createElement("a");
		link.text = "CSV";
		link.className = "download_btn";
		link.setAttribute("title", "Download as CSV");
		link.setAttribute("href", "#");

		chrome.storage.sync.get("time_logs", function (obj) {
			if (obj.time_logs) {
				if (obj.time_logs[label_id] && obj.time_logs[label_id].length) {
					var csv_data = [];
					var totalHours = 0;
					var totalPrice = 0;

					obj.time_logs[label_id].forEach(function (item) {
						let row = {
							Name: item.name,
							"Saved at": new Date(item.id).toLocaleString(),
							Time: formatTime(item.time),
							Hours: formatToHours(item.time),
						};
						if (client.rate) {
							row.Price = (client.rate * parseFloat(row.Hours)).toFixed(2);
						}
						csv_data.push(row);
						totalHours += item.time;
						totalPrice += parseFloat(row.Price);
					});

					let totalRow = {
						Name: "Total",
						"Saved at": "",
						Time: formatTime(totalHours),
						Hours: formatToHours(totalHours),
					};
					if (client.rate) {
						totalRow.Price = totalPrice;
					}

					csv_data.push(totalRow);

					var csv = convertArrayOfObjectsToCSV({
						data: csv_data,
						columnDelimiter: ";",
					});

					if (csv == null) return;

					if (!csv.match(/^data:text\/csv/i)) {
						csv = "data:text/csv;charset=utf-8," + csv;
					}

					let data = encodeURI(csv);
					link.setAttribute("href", data);
					link.setAttribute("id", label_id);
					var filename =
						document.getElementById(label_id).getAttribute("data-value") +
						".csv";
					link.setAttribute("download", filename);
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

		columnDelimiter = args.columnDelimiter || ",";
		lineDelimiter = args.lineDelimiter || "\n";
		keys = Object.keys(data[0]);

		result = "";
		result += keys.join(columnDelimiter);
		result += lineDelimiter;

		data.forEach(function (item) {
			ctr = 0;
			keys.forEach(function (key) {
				if (ctr > 0) result += columnDelimiter;
				result += item[key];
				ctr++;
			});

			result += lineDelimiter;
		});
		return result;
	}

	function openEditDialog() {
		document.getElementById("edit_entry_dialog").showModal();
	}

	function closeEditDialog() {
		document.getElementById("edit_entry_dialog").close();
	}

	document
		.getElementById("close_entry_dialog")
		.addEventListener("click", (e) => {
			e.currentTarget.closest("form").reset();
			closeEditDialog();
		});

	document
		.getElementById("edit_entry_dialog")
		.querySelector("form")
		.addEventListener("submit", (e) => {
			e.preventDefault();
			let form = e.currentTarget;
			let row_id = form.querySelector("input[name = row_id]").value;
			let label_id = form.querySelector("input[name = label_id]").value;

			chrome.storage.sync.get("time_logs", function (obj) {
				if (obj.time_logs) {
					if (obj.time_logs[label_id] && obj.time_logs[label_id].length) {
						obj.time_logs[label_id].forEach(function (item, index, arr) {
							if (row_id == item.id) {
								obj.time_logs[label_id][index].name =
									form.querySelector("input[name = name]").value;
								let hours = parseInt(
									form.querySelector("input[name = hours]").value,
								);
								let minutes = parseInt(
									form.querySelector("input[name = minutes]").value,
								);
								let seconds = parseInt(
									form.querySelector("input[name = seconds]").value,
								);
								obj.time_logs[label_id][index].time =
									hours * 60 * 60 + minutes * 60 + seconds;
							}
						});
						chrome.storage.sync.set(obj, function () {
							location.reload();
						});
					}
				}
			});
		});
});
