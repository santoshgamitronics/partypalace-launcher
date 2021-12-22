const { app, BrowserWindow, Menu, ipcMain, net, autoUpdater, dialog } = require("electron");

const { download } = require('electron-dl');
const path = require('path');

// Module with utilities for URL resolution and parsing.
const url = require('url')

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

// Force Single Instance Application
const gotTheLock = app.requestSingleInstanceLock()
if (gotTheLock) {
  app.on('second-instance', (e, argv) => {
    // Someone tried to run a second instance, we should focus our window.

    // Protocol handler for win32
    // argv: An array of the second instance’s (command line / deep linked) arguments

    // Protocol handler for win32
    if (process.platform == 'win32') {
      // Keep only command line / deep linked arguments
      logEverywhere(`process: ${process.argv}`)
      deeplinkingUrl = argv.slice(1);
    }

    logEverywhere(`createMainWindow# , ${Array.isArray(deeplinkingUrl)}, ${deeplinkingUrl[1]}`);
    if (deeplinkingUrl.length > 0) {
      const url = deeplinkingUrl[1];
      dialog.showMessageBox({
        title: `Welcome Back`,
        message: `You arrived from: ${url}`
      });
      let details = url.split('?')[1];
      details = details.split('&&');
      logEverywhere(details);
      if (details.length > 0) {
        store.set('userId', details[1]);
        store.set('sessionToken', details[0]);
        store.set('sessionId', details[2]);
        store.set('entityToken', details[3]);
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
  return
}

function launchPage() {
  let urlObj;
  logEverywhere(`sessionId>>>, ${store.get('sessionId')}`);
  store.delete('downloaded');

  if (false) {
    urlObj = {
      method: 'GET',
      protocol: 'https:',
      hostname: '4f3d-183-83-165-90.ngrok.io',
      path: `/validateSession/sess:${store.get('sessionId')}`,
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  } else {
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
  }

  const request = net.request({
    ...urlObj
  });

  request.on('response', (response) => {
    logEverywhere(`STATUS: ${response.statusCode}`);
    logEverywhere(`HEADERS: ${JSON.stringify(response.headers)}`);

    if (response.statusCode !== 200) {
      store.delete('userId');
      store.delete('sessionToken');
      store.delete('sessionId');
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
    logEverywhere(`ERROR>>>>: ${JSON.stringify(error)}`);
    if(error instanceof Error) { 
      store.delete('userId');
      store.delete('sessionToken');
      store.delete('sessionId');
      mainWindow.loadFile(`${__dirname}/app/index.html`);
    }
  });
  request.end();
};

const server = 'https://partypalace-launcher.vercel.app/'
const urlAutoUpdater = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL({ url: urlAutoUpdater });

function createMainWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "Partypalace Launcher",
    width: 650,
    height: 550,
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
    logEverywhere(process.argv);
    deeplinkingUrl = process.argv.slice(1);
    logEverywhere(`createMainWindow#, ${Array.isArray(deeplinkingUrl)}`);
    if (Array.isArray(deeplinkingUrl)
      && deeplinkingUrl.length > 0 
      && deeplinkingUrl[0] !== ".") {
      const url = deeplinkingUrl[0];
      dialog.showMessageBox({
        title: `Welcome Back`,
        message: `You arrived from: ${url}`
      });

      logEverywhere(`url ${url}`);

      let details = url.split('?')[1];
      details = details.split('&&');
      logEverywhere(details);
      if (details.length > 0) {
        store.set('userId', details[1]);
        store.set('sessionToken', details[0]);
        store.set('sessionId', details[2]);
        store.set('entityToken', details[3]);
        logEverywhere(`stored userd id 1', ${store.get('userId')}`);
      } else {
        dialog.showErrorBox('Not Found', 'Redirect link not found');
      }
    }
  }

  logEverywhere(`stored userd id', ${store.get('userId')}`);
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
    height: 300,
    icon: `${__dirname}/assets/icons/gami-256x256.png`,
    resizable: false,
    backgroundColor: "white",
  });

  aboutWindow.loadFile(`${__dirname}/app/about.html`);
}

const menu = [
  ...(isMac
    ? [
      {
        label: "OAuth Launcher",
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
    deeplinkingUrl = url
    logEverywhere('open-url# ' + deeplinkingUrl);
  })
})


ipcMain.on('authorize', async (e, authorizePlatform) => {
  if (authorizePlatform) {
    require("electron").shell.openExternal(`https://www.partypalace.xyz/auth/desktop/${authorizePlatform}`);
  }
});

ipcMain.on("download", async (event, info) => {
  logEverywhere(info);
  await download(BrowserWindow.getFocusedWindow(), 'https://p.bigstockphoto.com/GeFvQkBbSLaMdpKXF1Zv_bigstock-Aerial-View-Of-Blue-Lakes-And--227291596.jpg', { directory: `${__dirname}/downloads/` })
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
        logEverywhere(`response ${returnValue.response}`);
        mainWindow.loadFile(`${__dirname}/app/launcher.html`);

      })
    }).catch(err => {
      logEverywhere(JSON.stringify(err));
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

  const UPDATE_CHECK_INTERVAL = 180000 //every 3 mins
  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, UPDATE_CHECK_INTERVAL);

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: !isMac ? releaseNotes : releaseName,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.'
  }
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall()
  })
});

ipcMain.on("launch", async (event, info) => {
  logEverywhere('inside launch')
  const child = require('child_process').execFile;
  logEverywhere('child')
  const parameters = [`-SessionID=${store.get('sessionToken')}`, `-UserID=${store.get('userId')}`, `-EntityToken=${store.get('entityToken')}`];
  const executablePath = `${__dirname}\\downloads\\partyPalace.exe`;
  logEverywhere(executablePath);

  child(executablePath, parameters, function (err, data) {
    if (err) {
     logEverywhere(`here${err}`);
      return;
    }

    logEverywhere(data.toString());
  });
});


autoUpdater.on('error', message => {
  logEverywhere('There was a problem updating the application');
  logEverywhere(message);
})

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
    deeplinkingUrl = url
    // logEverywhere('open-url# ' + deeplinkingUrl)
  })
})
// Log both at dev console and at running node console instance
function logEverywhere(s) {
  console.log(s)
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(`console.log("${s}")`)
  }
}