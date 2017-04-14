
$(document).ready(function() {

	chrome.runtime.sendMessage({task: "start"}, function(response) {
	});
});

$(document).on('click', '#getSavedSearch', function() {
	chrome.runtime.sendMessage({task: "getSavedSearch"}, function(response) {
		console.log(response);
		for(i in response) {
			var details = response[i].detail;
			var detail_html = "";
			for(j in details) {
				var sub_detail = details[j];
				for(k in sub_detail) {
					if (typeof sub_detail[k].count !== 'undefined' && sub_detail[k].count !== null) {
						detail_html += '<span style="margin-right: 5px">' + decodeURIComponent(sub_detail[k].facet) +'</span>';
						detail_html += '<span class="label label-success">' + decodeURIComponent(sub_detail[k].label) +'</span>';
						detail_html += '<span class="badge">' + decodeURIComponent(sub_detail[k].count) +'</span></br>';
						
					}
				}
			}
			$('#Savedlists').append('<tr>' + '<td>' + response[i].id + '</td>' + '<td>' + response[i].count + '</td>' + '<td>' + response[i].name + '</td>' + '<td style="word-break: break-word;display: table;width: 500px;" title="' + response[i].url + '">'+ detail_html +'</td>' + '</tr>');
		}
		//$('#Savedlists').text(response.result);
	});
});
$(document).on('click', '#Savedlists > tr > *', function() {
	$('#url').text($(this).attr('title'));
});
$(document).on('click', '#StartSplit', function() {
	var url = $('#url').text();
	if (url === '') {
		alert("Please select one of saved search.");
		return;
	}
	chrome.runtime.sendMessage({task: "split", url: $('#url').text()}, function(response) {
		console.log(response);
	});
});
$(document).on('click', '#StartSplitNew', function() {
	count = 0;
	$('#containFilter').text("");
	var url = $('#url').text();
	if (url === '') {
		alert("Please select one of saved search.");
		return;
	}
	chrome.runtime.sendMessage({task: "splitNew", url: $('#url').text()}, function(response) {
		console.log(response);
	});
});

chrome.runtime.onConnect.addListener(function(port) {
	var count = 0;
    if (port.name === 'connect') {
        port.onMessage.addListener(function(msg) {
        	console.log(msg);
        	if (msg.type === 'A') {
	        	var detail_html = "";
	        	var totalCount = 0;
	            for(i in msg.indArr) {
	            	detail_html += '<span style="margin-right: 5px">' + msg.indArr[i].label + '(' + msg.indArr[i].value +')</span>';
	            	var count = parseInt(msg.indArr[i].count);
	            	totalCount = totalCount + count;
	            	if (count > 999)
						detail_html += '<span class="label label-danger">' + msg.indArr[i].count + '</span></br>';
					else
						detail_html += '<span class="label label-default">' + msg.indArr[i].count +'</span></br>';
	            }
	            $('#ind').append(detail_html);
	            $('#indtc').text(totalCount);
        	}
        	if (msg.type === 'B') {
	        	var detail_html = "";
	        	var totalCount = 0;
	            for(i in msg.countArrS) {
	            	if (msg.countArrS[i] !== null)
	            		totalCount = totalCount + parseInt(msg.countArrS[i]);
	            	detail_html += '<span style="margin-right: 5px">' + msg.countArrS[i] +'</span>';
					detail_html += '<span class="label label-danger">' + msg.resultArrS[i] + '</span></br>';
	            }
	            $('#ind999').append(detail_html);
	           
        	}
        	if (msg.type === 'C') {
	        	var detail_html = "";
	        	var totalCount = 0;
	            for(i in msg.locArr) {
	            	if (msg.locArr[i].selected === true) {
		            	detail_html += '<span style="margin-right: 5px">' + msg.locArr[i].label +'</span>';
						detail_html += '<span class="label label-danger">' + msg.locArr[i].count + '</span></br>';
					}
	            }
	            $('#loc').append(detail_html);
        	}
        	if (msg.type === 'CF') {
				var details = msg.containedFilterArr;
				var detail_html = "";
				for(j in details) {
					var sub_detail = details[j];
					for(k in sub_detail) {
						if (typeof sub_detail[k].count !== 'undefined' && sub_detail[k].count !== null) {
							detail_html += '<span style="margin-right: 5px">' + decodeURIComponent(sub_detail[k].label) +'</span>';
							detail_html += '<span class="badge">' + decodeURIComponent(sub_detail[k].count) +'</span>';
							detail_html += '<span class="label label-success">' + decodeURIComponent(sub_detail[k].shortName) +'</span></br>';
						}
					}
				}
				$('#containFilter').append(detail_html);
        	}
        	if (msg.type === 'BTU') {
        		var detail_html = "";
				detail_html += '<span style="margin-right: 5px">' + decodeURIComponent(msg.count) +'</span>';
				detail_html += '<span class="badge">' + decodeURIComponent(msg.shortName) +'</span>';
				detail_html += '<span class="label label-success">' + decodeURIComponent(msg.value) +'</span></br>';
				$('#containFilter').append(detail_html);
        	}
        	//var count = 0;        
        	if (msg.type === 'STU') {
        		var detail_html = "";
        		count += parseInt(msg.count);
				detail_html += '<span style="margin-right: 5px">' + decodeURIComponent(msg.count) +'</span>';
				detail_html += '<span class="label label-danger">' + decodeURIComponent(msg.shortName) +'</span></br>';
				$('#containFilter').append(detail_html);
				$('#containFilterFooter').text(count);
        	}        
        });
    }
});