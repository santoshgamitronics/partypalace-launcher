const { app, BrowserWindow, Menu, ipcMain, net, autoUpdater, dialog } = require("electron");

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
let deeplinkingUrl

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('electron-fiddle', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('electron-fiddle');
}

// Force Single Instance Application
const gotTheLock = app.requestSingleInstanceLock()
if (gotTheLock) {
  app.on('second-instance', (e, argv) => {
    // Someone tried to run a second instance, we should focus our window.

    // Protocol handler for win32
    // argv: An array of the second instance’s (command line / deep linked) arguments
    if (process.platform == 'win32') {
      // Keep only command line / deep linked arguments
      deeplinkingUrl = argv.slice(1)
    }
    logEverywhere('app.makeSingleInstance# ' + deeplinkingUrl)

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
  console.log('sessionId', store.get('sessionId'));
  if (isDev) {
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
      hostname: 'www.partypalace.xyz',
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
    console.log(`STATUS: ${response.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
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
    console.log(`ERROR>>>>: ${JSON.stringify(error)}`);
  });
  request.end();
};

const server = 'https://partypalace-launcher.vercel.app/'
const url = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL({ url });

function createMainWindow() {

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
    deeplinkingUrl = process.argv.slice(1)
  };
  
  logEverywhere('createMainWindow# ' + deeplinkingUrl);

  //launch the actual html pages
  launchPage();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });
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
  app.setAsDefaultProtocolClient('electron-fiddle')
}

app.on('will-finish-launching', function () {
  // Protocol handler for osx
  app.on('open-url', function (event, url) {
    event.preventDefault()
    deeplinkingUrl = url
    logEverywhere('open-url# ' + deeplinkingUrl)
  })
})

// Log both at dev console and at running node console instance
function logEverywhere(s) {
  console.log(s)
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(`console.log("${s}")`)
  }
}



ipcMain.on('authorize', async (e, authorizePlatform) => {
  if (authorizePlatform) {
    require("electron").shell.openExternal(`https://www.partypalace.xyz/auth/desktop/${authorizePlatform}`);
  }
});

ipcMain.on("download", async (event, info) => {
  console.log(info);
  await download(BrowserWindow.getFocusedWindow(), `https://partypalace-launcher-win.s3.amazonaws.com/PartyPalace.exe`, { directory: `${__dirname}/downloads/` })
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
        console.log(returnValue.response);
      })
    }).catch(err => {
      console.log(err);
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

if (!isDev) {
  const UPDATE_CHECK_INTERVAL = 10 * 60 * 1000
  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, UPDATE_CHECK_INTERVAL);
}

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
  const child = require('child_process').execFile;
  const filePath = path.join(`${__dirname}`, `downloads`, `PartyVerse (11.18)`, `PartyPalace`, `Binaries`, `Win64`, `PartyPalace.exe`);
  const parameters = [`--sessionId=${store.get('sessionToken')}`, `--userId=${store.get('userId')}`];
  console.log(filePath);

  child(filePath, parameters, function (err, data) {
    console.log(err)
    console.log(data.toString());
  });
});


autoUpdater.on('error', message => {
  console.error('There was a problem updating the application')
  console.error(message)
})