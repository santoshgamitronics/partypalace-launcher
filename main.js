const { app, BrowserWindow, Menu, ipcMain, net, autoUpdater } = require("electron");
const { download } = require('electron-dl');
const path = require('path');

const nativeImage = require("electron").nativeImage;
var image = nativeImage.createFromPath(__dirname + "assets/icons");

// where public folder on the root dir
image.setTemplateImage(true);


/**
 * set environment
 */
process.env.NODE_ENV = "production";

const BACKEND_URL = "https://www.partypalace.xyz"

let isDev = process.env.NODE_ENV === "production" ? true : true;
let isMac = process.platform === "darwin" ? true : false;

let mainWindow;
let aboutWindow;

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('electron-fiddle', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('electron-fiddle')
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })

    app.on("ready", () => {
        createMainWindow();

        /**set the mainmenu of the application */
        const mainMenu = Menu.buildFromTemplate(menu);
        Menu.setApplicationMenu(mainMenu);

        mainWindow.on("ready", () => (mainWindow = null));
    });

    app.on('open-url', (event, url) => {
        dialog.showErrorBox('Welcome Back', `You arrived from: ${url}`)
    })
}

function launchPage() {
    let urlObj;
    if (!isDev) {
        urlObj = {
            method: 'GET',
            protocol: 'http:',
            hostname: '127.0.0.1',
            port: '5002',
            path: '/validateSession',
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
            path: '/validateSession',
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
            mainWindow.loadFile("./app/index.html");
        } else {
            mainWindow.loadFile("./app/launcher.html");
        }
    });
    request.on('error', (error) => {
        console.log(`ERROR: ${JSON.stringify(error)}`);
    });
    request.end();
};

const server = 'https://partypalace-launcher.vercel.app';
const url = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL({ url });

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: "Auth Launcher",
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
    //launch the actual html pages
    launchPage();
}

function createAboutWindow() {
    aboutWindow = new BrowserWindow({
        title: "About OAuth Launcher",
        width: 300,
        height: 300,
        icon: `${__dirname}/assets/icons/gami-256x256.png`,
        resizable: false,
        backgroundColor: "white",
    });

    aboutWindow.loadFile("./app/about.html");
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
                        label: "Quit OAuth Launcher",
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
                label: "Quit OAuth Launcher",
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


// Handle window controls via IPC
ipcMain.on('shell:open', () => {
    const pageDirectory = __dirname.replace('app.asar', 'app.asar.unpacked')
    const pagePath = path.join('file://', pageDirectory, 'index.html')
    shell.openExternal(pagePath)
})

app.on("window-all-closed", () => {
    if (!isMac) {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

ipcMain.on('authorize', async (e, authorizePlatform) => {
    if (authorizePlatform) {
        require("electron").shell.openExternal(`${BACKEND_URL}/auth/${authorizePlatform}`);
    }
});

ipcMain.on("download", async (event, info) => {
    await download(BrowserWindow.getFocusedWindow(), ``, { directory: `${__dirname}/downloads/` })
        .then(dl => mainWindow.webContents.send("download complete", dl.getSavePath()));
});

const UPDATE_CHECK_INTERVAL = 10 * 60 * 1000
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
})

app.allowRendererProcessReuse = true;
