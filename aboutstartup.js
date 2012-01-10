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
  var headers = table.getElementsByTagName('tr')[0].getElementsByTagName('th');
  for each (var d in Object.keys(data).map(function(k) StartupData.key(data[k][0])).sort(Cc['@mozilla.org/xpcom/version-comparator;1'].getService(Ci.nsIVersionComparator).compare)) {
    var total = { main: 0, sessionRestored: 0, firstPaint: 0 };
    var num = { main: 0, sessionRestored: 0, firstPaint: 0 };
    for (var index = 0; index < data[d].length; index++) {
      var entry = data[d][index];
      var tr = document.createElement('tr');
      var prev_value = 0;
      for (var h = 0; h < headers.length; h++) {
        var td = document.createElement('td');
        var value = entry[headers[h].textContent];
        td.className = headers[h].className;
        td.appendChild(document.createTextNode(value));
        //td.appendChild(document.createTextNode(td.className == "time" ? value - prev_value : value));
        if (td.className == "time") {
          //if ((value - prev_value < 0) || isNaN(value - prev_value)) {
          if ((value < 0) || isNaN(value)) {
            td.className += ' weird';
          } else {
            total[headers[h].textContent] += value;
            //total[headers[h].textContent] += value - prev_value;
            num[headers[h].textContent]++;
          }
        }
        tr.appendChild(td);
        prev_value = value;
      }
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
      var value = td.className == "time" ? (total[headers[h].textContent] / num[headers[h].textContent]).toFixed(2) : entry[headers[h].textContent];
      td.appendChild(document.createTextNode(value));
      tr.appendChild(td);
    }
    table.insertBefore(tr, prev);
    prev = tr;
  }
}

window.addEventListener("load", init, false);
