const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

const nsIAppStartup = Ci.nsIAppStartup_MOZILLA_2_0 || Ci.nsIAppStartup;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

var location;

function AboutStartup() {}

AboutStartup.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classDescription: 'about:startup',
  classID: Components.ID('{ef5c36bf-8559-4449-8133-03e30e83c708}'),
  contractID: '@mozilla.org/network/protocol/about;1?what=startup',

  newChannel: function(uri)
  {
    var fileuri = Services.io.newFileURI(location);
    if (!location.isDirectory())
      fileuri = Services.io.newURI('jar:' + fileuri.spec + '!/', null, null);
    var channel = Services.io.newChannel(fileuri.spec + 'aboutstartup.html', null, null);
    var securityManager = Cc['@mozilla.org/scriptsecuritymanager;1'].getService(Ci.nsIScriptSecurityManager);
    var principal = securityManager.getSystemPrincipal(uri);
    channel.originalURI = uri;
    channel.owner = principal;
    return channel;
  },

  getURIFlags: function(uri)
  {
    return Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT | Ci.nsIAboutModule.ALLOW_SCRIPT;
  }
}

const AboutStartupFactory = XPCOMUtils.generateNSGetFactory([AboutStartup])(AboutStartup.prototype.classID);

var timer = false;

const PR_WRONLY = 0x02;
const PR_APPEND = 0x10;

function saveData() {
  var last;
  try {
    last = Services.prefs.getIntPref('extensions.aboutstartup.last');
  } catch(e) {
    last = 0;
  }
  var startupInfo = Cc['@mozilla.org/toolkit/app-startup;1'].getService(nsIAppStartup).getStartupInfo();
  var start = Math.floor(startupInfo.process / 1000);
  if (last >= start)
    return;

  var keys = Object.keys(startupInfo);
  var data = {};
  for each (var name in keys)
    if (name != 'process')
      data[name] = startupInfo[name] - startupInfo.process;
  data.version = Services.appinfo.version;
  data.appBuildID = Services.appinfo.appBuildID;
  var file = Services.dirsvc.get('ProfD', Ci.nsIFile);
  file.append('startup.log');
  if (!file.exists())
      file.create(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0666);
  var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
  foStream.init(file, PR_WRONLY | PR_APPEND, 0666, 0);
  var writer = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
  writer.init(foStream, "UTF-8", 0, 0x0000);
  writer.writeString(JSON.stringify(data) + "\n");
  writer.close();
  Services.prefs.setIntPref('extensions.aboutstartup.last', start);
}

const APP_STARTUP = 1;
const ADDON_ENABLE = 3;
const ADDON_UPGRADE = 7;

function startup(aData, aReason) {
  Cm.registerFactory(AboutStartup.prototype.classID,
                     AboutStartup.prototype.classDescription,
                     AboutStartup.prototype.contractID,
                     AboutStartupFactory);
  location = aData.installPath;
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
