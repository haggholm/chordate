import { app, BrowserWindow } from 'electron';
import createServer from './server';
import JSONStorage from './server/storage/JSONStorage';

app.whenReady().then(async function createWindow() {
  const port = 8080;
  await createServer({
    port,
    storage: new JSONStorage(app.getPath('appData')),
  });

  let win = new BrowserWindow({
    width: 1024,
    height: 768,
    // autoHideMenuBar: true,
    skipTaskbar: true,
    webPreferences: {
      // devTools: true,
      nodeIntegration: false,
      textAreasAreResizable: false,
    },
  });

  win.loadURL(`http://localhost:${port}`).then(null, (err) => {
    console.error('Error loading entrypoint:', err);
    // setTimeout(() => app.exit(1), 1000);
  });

  win.on('closed', () => {
    win = null;
  });
});
