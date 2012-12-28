let EXPORTED_SYMBOLS = ['StartupData'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

let StartupData = {};

StartupData.key = function(entry) {
  return entry.version + '|' + entry.appBuildID;
}

StartupData.cmp = function(entry1, entry2) {
  var keys1 = Object.keys(entry1);
  var keys2 = Object.keys(entry2);
  if (keys1.length != keys2.length)
    return false;
  for (var key of keys1)
    if (!(key in entry2) || (entry1[key] != entry2[key]))
      return false;
  return true;
}

XPCOMUtils.defineLazyGetter(StartupData, '_file', function () {
  var file = Services.dirsvc.get('ProfD', Ci.nsIFile);
  file.append('startup.log');
  return file;
});

StartupData.__defineGetter__('_data', function () {
  var fiStream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
  var data = {};

  if (StartupData._file.exists()) {
    fiStream.init(StartupData._file, -1, -1, 0);
    var liStream = fiStream.QueryInterface(Ci.nsILineInputStream);

    var lineData = {};
    var cont;
    do {
      cont = liStream.readLine(lineData);
      var entry = JSON.parse(lineData.value);
      var index = StartupData.key(entry);
      if (!(index in data))
        data[index] = new Array();
      data[index].push(entry);
    } while (cont);
    fiStream.close();
  }

  var index = StartupData.key(StartupData.current);
  if (!(index in data))
    data[index] = [StartupData.current]
  else
    data[index].push(StartupData.current);

  return data;
});

StartupData.__defineGetter__('timeOfLast', function () {
  try {
    return Services.prefs.getIntPref('extensions.aboutstartup.last');
  } catch(e) {
    return 0;
  }
});

StartupData.__defineSetter__('timeOfLast', function(value) {
  Services.prefs.setIntPref('extensions.aboutstartup.last', value);
});

StartupData.__defineGetter__('startupInfo', function () {
  var info = Cc['@mozilla.org/toolkit/app-startup;1']
             .getService(Ci.nsIAppStartup_MOZILLA_2_0 || Ci.nsIAppStartup)
             .getStartupInfo();
  return info;
});

StartupData.__defineGetter__('current', function() {
  var entry = {};
  let thread = Services.tm.currentThread;
  for (var key of Object.keys(StartupData.startupInfo).filter(function(k) k != 'process'))
    entry[key] = StartupData.startupInfo[key] - StartupData.startupInfo.process;

  entry.version = Services.appinfo.version;
  entry.appBuildID = Services.appinfo.appBuildID;
  return entry;
});

const PR_WRONLY = 0x02;
const PR_APPEND = 0x10;

StartupData.save = function() {
  var start = Math.floor(StartupData.startupInfo.process / 1000);
  if (StartupData.timeOfLast >= start)
    return;

  var file = StartupData._file;
  if (!file.exists())
      file.create(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0666);
  var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
  foStream.init(file, PR_WRONLY | PR_APPEND, 0666, 0);
  var writer = Cc['@mozilla.org/intl/converter-output-stream;1'].createInstance(Ci.nsIConverterOutputStream);
  writer.init(foStream, 'UTF-8', 0, 0x0000);
  writer.writeString(JSON.stringify(StartupData.current) + '\n');
  writer.close();
  StartupData.timeOfLast = start;
};
