const { app, BrowserWindow, Menu, ipcMain, net } = require("electron");
const child = require('child_process').execFile;
const { download } = require('electron-dl');
const path = require('path');
const fs = require('fs');


const nativeImage = require("electron").nativeImage;
var image = nativeImage.createFromPath(__dirname + "assets/icons");

// where public folder on the root dir
image.setTemplateImage(true);


/**
 * set environment
 */
process.env.NODE_ENV = "production";

let isDev = process.env.NODE_ENV === "production" ? true : true;
let isMac = process.platform === "darwin" ? true : false;

let mainWindow;
let aboutWindow;

function launchPage() {
    const request = net.request({
        method: 'GET',
        protocol: 'http:',
        hostname: '127.0.0.1',
        port: '5002',
        path: '/validateSession',
        redirect: 'follow',
        headers: {
            'Content-Type': 'application/json'
        }
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
        },
    });

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

app.on("ready", () => {
    createMainWindow();

    /**set the mainmenu of the application */
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on("ready", () => (mainWindow = null));
});

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
    if(authorizePlatform) {
        require("electron").shell.openExternal(`http://localhost:5002/auth/${authorizePlatform}`);
    }
});

ipcMain.on("download", async (event, info) => {
    await download(BrowserWindow.getFocusedWindow(), `http://i3.ytimg.com/vi/J---aiyznGQ/mqdefault.jpg`, { directory: `${__dirname}/downloads/` })
        .then(dl => mainWindow.webContents.send("download complete", dl.getSavePath()));
});

app.allowRendererProcessReuse = true;
