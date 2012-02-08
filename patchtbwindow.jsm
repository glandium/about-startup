let EXPORTED_SYMBOLS = ['patchTBWindow'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cm = Components.manager;

Cu.import("resource://gre/modules/Services.jsm");

let patchTBWindow = {};

let _menuItem = null;

function isThunderbird()
{
  let APP_ID = Services.appinfo.QueryInterface(Ci.nsIXULRuntime).ID;
  return APP_ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
}

var global = this;

function monkeyPatchWindow(w, loadedAlready) {
  let doIt = function () {
    w.removeEventListener("load", doIt, false);
    
    let taskPopup = w.document.getElementById("taskPopup");
    let tabmail = w.document.getElementById("tabmail");
    let menuitem = w.document.getElementById(_menuItem.id);

    // Check the windows is a mail:3pane
    // and should be patched or not
    if (!taskPopup || !tabmail || menuitem)
      return;

    menuitem = w.document.createElement("menuitem");
    menuitem.addEventListener("command", function () {
      w.document.getElementById("tabmail").openTab(
        "contentTab",
        { contentPage: _menuItem.url }
      );
    }, false);
    menuitem.setAttribute("label", _menuItem.label);
    menuitem.setAttribute("id", _menuItem.id);
    taskPopup.appendChild(menuitem);
  };
  if (loadedAlready)
    doIt();
  else
    w.addEventListener("load", doIt, false);
}

function unMonkeyPatchWindow(w) {
  let menuitem = w.document.getElementById(_menuItem.id);
  menuitem.parentNode.removeChild(menuitem);
}

function startup(options) {
  _menuItem = options.menuItem;
  
  // For Thunderbird, since there's no URL bar, we add a menu item to make it
  // more discoverable.
  if (isThunderbird()) {
    // Thunderbird-specific JSM
    Cu.import("resource:///modules/iteratorUtils.jsm", global);

    // Patch all existing windows
    for each (let w in fixIterator(Services.wm.getEnumerator("mail:3pane"), Ci.nsIDOMWindow)) {
      // True means the window's been loaded already, so add the menu item right
      // away (the default is: wait for the "load" event).
      monkeyPatchWindow(w.window, true);
    }

    // Patch all future windows
    Services.ww.registerNotification({
      observe: function (aSubject, aTopic, aData) {
        if (aTopic == "domwindowopened") {
          aSubject.QueryInterface(Ci.nsIDOMWindow);
          monkeyPatchWindow(aSubject.window);
        }
      },
    });
  }
}

function shutdown() {
  if (isThunderbird) {
    // Un-patch all existing windows
    for each (let w in fixIterator(Services.wm.getEnumerator("mail:3pane")))
      unMonkeyPatchWindow(w);
    
    _menuItem = null;
  }
}

patchTBWindow.startup = startup;
patchTBWindow.shutdown = shutdown;
