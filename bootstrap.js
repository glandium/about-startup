const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

function AboutStartup() {}

AboutStartup.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classDescription: 'about:startup',
  classID: Components.ID('{ef5c36bf-8559-4449-8133-03e30e83c708}'),
  contractID: '@mozilla.org/network/protocol/about;1?what=startup',

  newChannel: function(uri)
  {
    var ioService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
    var html = 'data:text/html,<html><body><table>';
    var startupInfo = Cc['@mozilla.org/toolkit/app-startup;1'].getService(Ci.nsIAppStartup_MOZILLA_2_0).getStartupInfo();
    var keys = Object.keys(startupInfo);
    keys.sort(function(a, b) { return startupInfo[a] - startupInfo[b]; });
    for each (var name in keys)
      if (name != 'process')
        html += '<tr><td>' + name + '</td><td>' + (startupInfo[name] - startupInfo.process) + '</td></tr>';
    html += '</table></body></html>';
    var channel = ioService.newChannel(html, null, null);
    var securityManager = Cc['@mozilla.org/scriptsecuritymanager;1'].getService(Ci.nsIScriptSecurityManager);
    var principal = securityManager.getCodebasePrincipal(uri);
    channel.originalURI = uri;
    channel.owner = principal;
    return channel;
  },

  getURIFlags: function(uri)
  {
    return Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT;
  }
}

const AboutStartupFactory = XPCOMUtils.generateNSGetFactory([AboutStartup])(AboutStartup.prototype.classID);

var timer = false;

const PR_WRONLY = 0x02;
const PR_APPEND = 0x10;

function saveData() {
  var prefs = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).getBranch('extensions.aboutstartup.');
  var last;
  try {
    last = prefs.getIntPref('last');
  } catch(e) {
    last = 0;
  }
  var startupInfo = Cc['@mozilla.org/toolkit/app-startup;1'].getService(Ci.nsIAppStartup_MOZILLA_2_0).getStartupInfo();
  var start = Math.floor(startupInfo.process / 1000);
  if (last >= start)
    return;

  var keys = Object.keys(startupInfo);
  var data = {};
  for each (var name in keys)
    if (name != 'process')
      data[name] = startupInfo[name] - startupInfo.process;
  var appInfo = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULAppInfo);
  data.version = appInfo.version;
  data.appBuildID = appInfo.appBuildID;
  var file = Cc['@mozilla.org/file/directory_service;1'].getService(Ci.nsIProperties).get('ProfD', Ci.nsIFile);
  file.append('startup.log');
  if (!file.exists())
      file.create(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0666);
  var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
  foStream.init(file, PR_WRONLY | PR_APPEND, 0666, 0);
  var writer = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
  writer.init(foStream, "UTF-8", 0, 0x0000);
  writer.writeString(JSON.stringify(data) + "\n");
  writer.close();
  prefs.setIntPref('last', start);
}

const APP_STARTUP = 1;
const ADDON_ENABLE = 3;
const ADDON_UPGRADE = 7;

function startup(aData, aReason) {
  Cm.registerFactory(AboutStartup.prototype.classID,
                     AboutStartup.prototype.classDescription,
                     AboutStartup.prototype.contractID,
                     AboutStartupFactory);
  if (aReason == APP_STARTUP) {
    timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
    timer.initWithCallback(saveData, 10000, Ci.nsITimer.TYPE_ONE_SHOT);
  } else if ((aReason == ADDON_ENABLE) || (aReason == ADDON_UPGRADE)) {
    try {
      saveData();
    } catch(e) {}
  }
}
function shutdown(aData, aReason) {
  try {
    saveData();
  } catch(e) {}
  Cm.unregisterFactory(AboutStartup.prototype.classID, AboutStartupFactory);
}
function install(aData, aReason) { }
function uninstall(aData, aReason) { }
