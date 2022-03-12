const { app, BrowserWindow, Menu, ipcMain, net, autoUpdater, dialog, webContents } = require("electron");

// const uaup = require('uaup-js');

const { download } = require('electron-dl');
const path = require('path');

const nativeImage = require("electron").nativeImage;
var image = nativeImage.createFromPath(__dirname + "assets/icons");

// where public folder on the root dir
image.setTemplateImage(true);

//electron store
const Store = require('electron-store');
const store = new Store();

/**
 * set environment
 */
process.env.NODE_ENV = "production";

let isDev = process.env.NODE_ENV === "dev" ? true : true;
let isMac = process.platform === "darwin" ? true : false;

const BACKEND_URL = isDev ? "https://4632-183-83-165-90.ngrok.io" : "https://www.partypalace.xyz";

let mainWindow;
let aboutWindow;

// Deep linked url
var deeplinkingUrl;

function replaceEncodeSpaceString(str) {
  return decodeURI(str);
}

// Force Single Instance Application
const gotTheLock = app.requestSingleInstanceLock()
if (gotTheLock) {
  app.on('second-instance', (e, argv) => {

    if (process.platform == 'win32') {
      deeplinkingUrl = argv.slice(1);
    }

    if (deeplinkingUrl.length > 0) {
      const url = deeplinkingUrl[1];
      let details = url.split('?')[1];
      details = details.split('&&');
      if (details.length > 0) {
        store.set('userId', details[1]);
        store.set('sessionToken', details[0]);
        store.set('sessionId', details[2]);
        store.set('entityToken', details[3]);
        store.set('playerName', details[4]);
        const playerName = details[4];
        mainWindow.webContents.send('assign-player-name', replaceEncodeSpaceString(playerName).toString());

        dialog.showMessageBox({
          title: `Welcome Back ${replaceEncodeSpaceString(playerName)}`
        });
        if (store.get('downloaded')) {
          mainWindow.loadFile(`${__dirname}/app/launcher.html`);
        } else {
          mainWindow.loadFile(`${__dirname}/app/download.html`);
        }
      }
    } else {
      dialog.showErrorBox('Not Found', 'Redirect link not found');
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
} else {
  app.quit()
}

function launchPage() {
  let urlObj;
  store.delete('downloaded');
  urlObj = {
    method: 'GET',
    protocol: 'https:',
    hostname: 'dev.partypalace.xyz',
    path: `/validateSession/sess:${store.get('sessionId')}`,
    redirect: 'follow',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const request = net.request({
    ...urlObj
  });

  request.on('response', (response) => {
   if (response.statusCode !== 200) {
      store.delete('userId');
      store.delete('sessionToken');
      store.delete('sessionId');
      store.delete('entityToken');
      store.delete('playerName');
      mainWindow.loadFile(`${__dirname}/app/index.html`);
    } else {
      if (store.get('downloaded')) {
        mainWindow.loadFile(`${__dirname}/app/launcher.html`);
      } else {
        mainWindow.loadFile(`${__dirname}/app/download.html`);
      }
    }
  });

  request.on('error', (error) => {
    if (error instanceof Error) {
      store.delete('userId');
      store.delete('sessionToken');
      store.delete('sessionId');
      store.delete('entityToken');
      store.delete('playerName');
      mainWindow.loadFile(`${__dirname}/app/index.html`);
    }
  });
  request.end();
};

const server = 'https://partypalace-launcher-aansikr5e-santoshgamitronics.vercel.app/'
const urlAutoUpdater = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL({ url: urlAutoUpdater });

setInterval(() => {
  autoUpdater.checkForUpdates();
}, 6000);

function createMainWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "Partypalace Launcher",
    width: 900,
    height: 750,
    icon: image,
    resizable: false,
    backgroundColor: "white",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      }
    },
  });

  // Protocol handler for win32
  if (process.platform == 'win32') {
    // Keep only command line / deep linked arguments
    deeplinkingUrl = process.argv.slice(1);
    if (Array.isArray(deeplinkingUrl)
      && deeplinkingUrl.length > 0
      && deeplinkingUrl[0] !== ".") {
      const url = deeplinkingUrl[0];

     let details = url.split('?')[1];
      details = details.split('&&');
      if (details.length > 0) {
        store.set('userId', details[1]);
        store.set('sessionToken', details[0]);
        store.set('sessionId', details[2]);
        store.set('entityToken', details[3]);
        store.set('playerName', details[4]);
        const playerName = details[4];
        dialog.showMessageBox({
          title: `Welcome Back ${replaceEncodeSpaceString(playerName)}`
        }, (response) => {
          mainWindow.webContents.send('get-receieved-player-name', replaceEncodeSpaceString(store.get('playerName')));
        });
      } else {
        dialog.showErrorBox('Not Found', 'Redirect link not found');
      }
    }
  }

  launchPage();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: "About Launcher",
    width: 300,
    height: 150,
    icon: `${__dirname}/assets/icons/win/partynite.ico`,
    resizable: false,
    backgroundColor: "white",
  });

  aboutWindow.loadFile(`${__dirname}/app/about.html`);
  aboutWindow.setMenuBarVisibility(false);
}

const menu = [
  ...(isMac
    ? [
      {
        label: "Partynite Launcher",
        submenu: [
          {
            label: "About",
            click: createAboutWindow,
          },
          {
            label: "Quit",
            click: () => { app.quit(); }
          }
        ],
      }
    ]
    : []),
  ...(!isMac
    ? [
      {
        label: "Help",
        submenu: [
          {
            label: "About",
            click: createAboutWindow,
          },
        ],
      },
      {
        label: "Quit",
        click: () => { app.quit(); }
      }
    ]
    : []),
  ...(isDev
    ? [
      {
        label: "Developer",
        submenu: [
          {
            role: "reload",
          },
          {
            role: "forcereload",
          },
          {
            type: "separator",
          },
          {
            role: "toggledevtools",
          },
        ],
      },
    ]
    : []),
];


// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createMainWindow();

  /**set the mainmenu of the application */
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  mainWindow.on("ready", () => (mainWindow = null));
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createMainWindow()
  }
})

if (!app.isDefaultProtocolClient('electron-fiddle')) {
  // Define custom protocol handler. Deep linking works on packaged versions of the application!
  app.setAsDefaultProtocolClient('electron-fiddle');
}

//this is for mac-os
app.on('will-finish-launching', function () {
  // Protocol handler for osx
  app.on('open-url', function (event, url) {
    event.preventDefault()
    deeplinkingUrl = url;
  })
})


ipcMain.on('authorize', async (e, authorizePlatform) => {
  if (authorizePlatform) {
    require("electron").shell.openExternal(`https://dev.partypalace.xyz/auth/desktop/${authorizePlatform}`);
  }
});

ipcMain.on("download", async (event, info) => {
  await download(BrowserWindow.getFocusedWindow(), `https://www.bing.com/images/search?q=dummy+image+download&id=065008F2773C839D45851E59F70B29AFB088EEF4&FORM=IQFRBA`, { directory: `${__dirname}/downloads/` })
    .then(dl => {
      store.set('downloaded', true);
      mainWindow.webContents.send('downloaded', true);
      mainWindow.webContents.send('download-progress', false);
      mainWindow.webContents.send("download complete", dl.getSavePath());
      const dialogOpts = {
        type: 'info',
        title: 'Download update',
        message: 'Download complete',
      }
      dialog.showMessageBox(dialogOpts).then((returnValue) => {
        mainWindow.loadFile(`${__dirname}/app/launcher.html`);
      })
    }).catch(err => {
      store.set('downloaded', false);
      mainWindow.webContents.send('download-progress', false);
      const dialogOpts = {
        type: 'error',
        title: 'Download Update',
        message: 'Error downloading',
      }
      dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) return null;
      })
    });
});


ipcMain.on("launch", async (event, info) => {
  const child = require('child_process').execFile;
  const playerName = replaceEncodeSpaceString(store.get('playerName'));
  const parameters = [`-SessionID=${store.get('sessionToken')}`, `-UserID=${store.get('userId')}`, `-EntityToken=${store.get('entityToken')}`, `-PlayerName=${playerName}`];
  const executablePath = `${__dirname}\\downloads\\partyPalace.exe`;

  child(executablePath, parameters, function (err, data) {
    if (err) {
      return;
    }

  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

if (!app.isDefaultProtocolClient('electron-fiddle')) {
  // Define custom protocol handler. Deep linking works on packaged versions of the application!
  app.setAsDefaultProtocolClient('electron-fiddle')
}

app.on('will-finish-launching', function () {
  // Protocol handler for osx
  app.on('open-url', function (event, url) {
    event.preventDefault()
    deeplinkingUrl = url;
  })
})


autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.'
  }

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall()
  })
});


autoUpdater.on('error', message => {
  console.error('There was a problem updating the application');
  console.error(message);
});
// Log both at dev console and at running node console instance
// function logEverywhere(s) {
//   console.log(s)
//   if (mainWindow && mainWindow.webContents) {
//     mainWindow.webContents.executeJavaScript(`console.log("${s}")`)
//   }
// }