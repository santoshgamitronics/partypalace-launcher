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

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('electron-fiddle', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('electron-fiddle');
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

    // Create mainWindow, load the rest of the app, etc...
    app.whenReady().then(() => {
        createMainWindow();

        /**set the mainmenu of the application */
        const mainMenu = Menu.buildFromTemplate(menu);
        Menu.setApplicationMenu(mainMenu);

        mainWindow.on("ready", () => (mainWindow = null));
    })

    app.on('open-url', (event, url) => {
        dialog.showErrorBox('Welcome Back', `You arrived from: ${url}`);
        console.log('url', JSON.stringify(url));
        let details = url.split('?')[1];
        details = details.split('&&');
        if (details.length > 0) {
            store.set('userId', details[1]);
            store.set('sessionToken', details[0]);
            store.set('sessionId', details[2]);
            mainWindow.loadFile("./app/download.html");
        } else {
            dialog.showErrorBox('unknown issue', `please retry again`);
        }
    });
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
            mainWindow.loadFile("./app/index.html");
        } else {
            if (store.get('downloaded')) {
                mainWindow.loadFile("./app/launcher.html");
            } else {
                mainWindow.loadFile("./app/download.html");
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
    //launch the actual html pages
    launchPage();
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


// Handle window controls via IPC
ipcMain.on('shell:open', () => {
    const pageDirectory = __dirname.replace('app.asar', 'app.asar.unpacked')
    const pagePath = path.join('file://', pageDirectory, 'index.html')
    shell.openExternal(pagePath)
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

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

app.allowRendererProcessReuse = true;
