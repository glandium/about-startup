const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://aboutstartup/startupdata.jsm');

function init() {
  // Wait for StartupData.current
  try {
    StartupData.current;
  } catch(e) {
    window.setTimeout(init, 500);
    return;
  }
  var table = document.getElementById('table');
  var data = StartupData._data;
  var prev;
  var headers_row = table.getElementsByTagName('tr')[0];
  var headers = headers_row.getElementsByTagName('th');
  for each (var d in Object.keys(data).map(function(k) StartupData.key(data[k][0])).sort(Cc['@mozilla.org/xpcom/version-comparator;1'].getService(Ci.nsIVersionComparator).compare)) {
    var total = { };
    var num = { };
    for (var h = 0; h < headers.length; h++) {
      total[headers[h].textContent] = 0;
      num[headers[h].textContent] = 0;
    }
    for each (var entry in data[d]) {
      var tr = document.createElement('tr');
      for (var h = 0; h < headers.length; h++) {
        var td = document.createElement('td');
        var value = entry[headers[h].textContent];
        td.className = headers[h].className;
        td.appendChild(document.createTextNode(value));
        if (td.className != "string") {
          if ((value < 0) || isNaN(value)) {
            td.className += ' weird';
          } else {
            total[headers[h].textContent] += value;
            num[headers[h].textContent]++;
          }
        }
        tr.appendChild(td);
      }
      Object.keys(entry).filter(function(element, index, array) {
        for (var h = 0; h < headers.length; h++)
          if (element == headers[h].textContent)
            return false;

        return true;
      }).forEach(function(key, index, array) {
        total[key] = 0;
        num[key] = 0;
        var th = document.createElement('th');
        th.appendChild(document.createTextNode(key));
        headers_row.appendChild(th);
        var td = document.createElement('td');
        var value = entry[key];
        td.appendChild(document.createTextNode(value));
        if ((value < 0) || isNaN(value)) {
          td.className += ' weird';
        } else {
          total[key] += value;
          num[key]++;
        }
        tr.appendChild(td);
      });
      if ((d == StartupData.key(StartupData.current)) &&
          StartupData.cmp(StartupData.current, entry))
        tr.className = 'current';
      if (prev)
        table.insertBefore(tr, prev);
      else
        table.appendChild(tr);
      prev = tr;
    }
    tr = document.createElement('tr');
    tr.className = 'average';
    for (var h = 0; h < headers.length; h++) {
      var td = document.createElement('td');
      td.className = headers[h].className;
      var value = td.className == "string" ? entry[headers[h].textContent] : (total[headers[h].textContent] / num[headers[h].textContent]).toFixed(2);
      td.appendChild(document.createTextNode(value));
      tr.appendChild(td);
    }
    table.insertBefore(tr, prev);
    prev = tr;
  }
}

window.addEventListener("load", init, false);
