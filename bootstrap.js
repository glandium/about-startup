/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is about:startup
 *
 * The Initial Developer of the Original Code is
 * Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Mike Hommey <mh@glandium.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function AboutStartup() {}

AboutStartup.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classDescription: "about:startup",
  classID: Components.ID("{ef5c36bf-8559-4449-8133-03e30e83c708}"),
  contractID: "@mozilla.org/network/protocol/about;1?what=startup",

  newChannel: function(uri)
  {
    var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var html = "data:text/html,<html><body><table>";
    var startupInfo = Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup_MOZILLA_2_0).getStartupInfo();
    var keys = Object.keys(startupInfo);
    keys.sort(function(a, b) { return startupInfo[a] - startupInfo[b]; });
    for each (var name in keys)
      if (name != "process")
        html += "<tr><td>" + name + "</td><td>" + (startupInfo[name] - startupInfo.process) + "</td></tr>";
    html += "</table></body></html>";
    var channel = ioService.newChannel(html, null, null);
    var securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
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

function startup(aData, aReason) {
  Cm.registerFactory(AboutStartup.prototype.classID,
                     AboutStartup.prototype.classDescription,
                     AboutStartup.prototype.contractID,
                     AboutStartupFactory);
}
function shutdown(aData, aReason) {
  Cm.unregisterFactory(AboutStartup.prototype.classID, AboutStartupFactory);
}
function install(aData, aReason) { }
function uninstall(aData, aReason) { }
