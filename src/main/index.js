import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { SerialPort } from 'serialport'

let activePort = null
let activePortPath = ''
let activeBaudRate = 0

const broadcast = (channel, payload) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(channel, payload)
  })
}

const publishStatus = (status) => {
  broadcast('morse:status', status)
}

const closeActivePort = async () => {
  if (!activePort) {
    return
  }

  const portToClose = activePort
  activePort = null
  activePortPath = ''
  activeBaudRate = 0

  await new Promise((resolve) => {
    portToClose.close(() => resolve())
  })
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    title: 'MorseJS - Comunicacao serial em código morse',
    icon: join(__dirname, '../../resources/icon.png'),
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('morse:list-ports', async (event) => {
    try {
      const list = await SerialPort.list()
      event.sender.send('morse:ports', list)
      return list
    } catch (error) {
      console.error('Falha ao listar portas seriais:', error)
      event.sender.send('morse:ports', [])
      return []
    }
  })

  ipcMain.handle('morse:connect', async (_, portPath, baudRate) => {
    if (!portPath) {
      return { ok: false, message: 'Porta invalida.' }
    }

    await closeActivePort()

    try {
      const port = new SerialPort({ path: portPath, baudRate, autoOpen: false })

      port.on('data', (data) => {
        const payload = Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
        broadcast('morse:data', payload)
      })

      port.on('error', (error) => {
        console.error('Erro na porta serial:', error)
        publishStatus({ connected: false, message: error?.message || 'Erro serial.' })
      })

      port.on('close', () => {
        publishStatus({ connected: false, message: 'Desconectado' })
      })

      await new Promise((resolve, reject) => {
        port.open((error) => (error ? reject(error) : resolve()))
      })

      activePort = port
      activePortPath = portPath
      activeBaudRate = baudRate

      publishStatus({ connected: true, port: portPath, baudRate })
      return { ok: true }
    } catch (error) {
      console.error('Falha ao conectar na porta:', error)
      publishStatus({ connected: false, message: error?.message || 'Falha ao conectar.' })
      return { ok: false, message: error?.message || 'Falha ao conectar.' }
    }
  })

  ipcMain.handle('morse:disconnect', async () => {
    await closeActivePort()
    publishStatus({ connected: false, message: 'Desconectado' })
    return { ok: true }
  })

  ipcMain.handle('morse:send', async (_, payload) => {
    if (!activePort || !activePort.isOpen) {
      return { ok: false, message: 'Porta nao conectada.' }
    }

    try {
      await new Promise((resolve, reject) => {
        activePort.write(payload, (error) => (error ? reject(error) : resolve()))
      })
      return { ok: true, port: activePortPath, baudRate: activeBaudRate }
    } catch (error) {
      console.error('Falha ao enviar dados:', error)
      return { ok: false, message: error?.message || 'Falha ao enviar.' }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
