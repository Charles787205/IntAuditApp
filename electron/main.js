const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

// Fix for GLib-GObject errors and shared memory issues on Linux
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('--no-sandbox');
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--disable-software-rasterizer');
  app.commandLine.appendSwitch('--disable-background-timer-throttling');
  app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('--disable-renderer-backgrounding');
  app.commandLine.appendSwitch('--disable-features=TranslateUI');
  app.commandLine.appendSwitch('--disable-extensions');
  // Additional fixes for shared memory issues
  app.commandLine.appendSwitch('--disable-dev-shm-usage');
  app.commandLine.appendSwitch('--disable-gpu');
  app.commandLine.appendSwitch('--no-first-run');
  app.commandLine.appendSwitch('--disable-default-apps');
  app.commandLine.appendSwitch('--disable-web-security');
  // Even more comprehensive Linux fixes
  app.commandLine.appendSwitch('--disable-setuid-sandbox');
  app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('--disable-accelerated-video-decode');
  app.commandLine.appendSwitch('--disable-background-networking');
  app.commandLine.appendSwitch('--disable-component-update');
  app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
  app.commandLine.appendSwitch('--memory-pressure-off');
  app.commandLine.appendSwitch('--max_old_space_size=4096');
}

// Set up DATABASE_URL for both development and production builds
if (!isDev) {
  // In production, set the database path relative to the app resources
  const dbPath = path.join(process.resourcesPath, 'prisma', 'intdb.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log('Production DATABASE_URL:', process.env.DATABASE_URL);
} else {
  // In development, use the local database with absolute path
  const dbPath = path.join(__dirname, '..', 'prisma', 'intdb.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log('Development DATABASE_URL:', process.env.DATABASE_URL);
}

let nextApp;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      // Additional security settings for Linux
      sandbox: process.platform !== 'linux'
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