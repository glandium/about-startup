const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

const nsIAppStartup = Ci.nsIAppStartup_MOZILLA_2_0 || Ci.nsIAppStartup;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

function AboutStartup() {}

AboutStartup.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classDescription: 'about:startup',
  classID: Components.ID('{ef5c36bf-8559-4449-8133-03e30e83c708}'),
  contractID: '@mozilla.org/network/protocol/about;1?what=startup',

  newChannel: function(uri)
  {
    var channel = Services.io.newChannel('resource://aboutstartup/aboutstartup.html', null, null);
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
};

const AboutStartupFactory = XPCOMUtils.generateNSGetFactory([AboutStartup])(AboutStartup.prototype.classID);

const APP_STARTUP = 1;
const ADDON_ENABLE = 3;
const ADDON_UPGRADE = 7;

var _StartupData;

function saveData() {
  try {
    if (_StartupData)
      _StartupData.save();
  } catch(e) {
     Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer)
     .initWithCallback(saveData, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
  }
}

function startup(aData, aReason) {
  Cm.registerFactory(AboutStartup.prototype.classID,
                     AboutStartup.prototype.classDescription,
                     AboutStartup.prototype.contractID,
                     AboutStartupFactory);
  var fileuri = Services.io.newFileURI(aData.installPath);
  if (!aData.installPath.isDirectory())
    fileuri = Services.io.newURI('jar:' + fileuri.spec + '!/', null, null);
  Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler).setSubstitution('aboutstartup', fileuri);
  Components.utils.import('resource://aboutstartup/startupdata.jsm');
  _StartupData = StartupData;
  if (aReason == APP_STARTUP) {
    Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer)
    .initWithCallback(saveData, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
  } else {
    saveData();
  }
}
function shutdown(aData, aReason) {
  try {
    _StartupData.save();
  } catch(e) {}
  // Stop any pending saveData()
  _StartupData = undefined;
  Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler).setSubstitution('aboutstartup', null);
  Cm.unregisterFactory(AboutStartup.prototype.classID, AboutStartupFactory);
}
function install(aData, aReason) { }
function uninstall(aData, aReason) { }
