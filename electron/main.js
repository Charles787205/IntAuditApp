const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

// Set up DATABASE_URL for production builds
if (!isDev) {
  // In production, set the database path relative to the app resources
  const dbPath = path.join(process.resourcesPath, 'prisma', 'intdb.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
} else {
  // In development, use the local database
  process.env.DATABASE_URL = 'file:./prisma/intdb.db';
}

let nextApp;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    titleBarStyle: 'default',
    show: false
  });

  // Show window when ready to prevent visual flash
  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    // In production, start Next.js server
    win.loadURL('http://localhost:3000');
  }
};

app.whenReady().then(async () => {
  if (!isDev) {
    // Start Next.js server in production
    const next = require('next');
    nextApp = next({ dev: false, dir: path.join(__dirname, '../') });
    await nextApp.prepare();
    
    const { createServer } = require('http');
    const server = createServer(nextApp.getRequestHandler());
    
    server.listen(3000, (err) => {
      if (err) throw err;
      console.log('> Ready on http://localhost:3000');
      createWindow();
    });
  } else {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (nextApp) {
    nextApp.close();
  }
});