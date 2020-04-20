import { app, BrowserWindow } from 'electron';

app.whenReady().then(async function createWindow() {
  let win = new BrowserWindow({
    width: 1024,
    height: 768,
    autoHideMenuBar: true,
    skipTaskbar: true,
    webPreferences: {
      // devTools: true,
      nodeIntegration: true,
      textAreasAreResizable: false,
    },
  });

  win.loadFile(`${__dirname}/index.html`);

  win.on('closed', () => {
    win = null;
  });
});
