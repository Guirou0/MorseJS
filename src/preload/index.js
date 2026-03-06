import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  morseApi: {
    listPorts: () => ipcRenderer.invoke('morse:list-ports'),
    connect: (portPath, baudRate) => ipcRenderer.invoke('morse:connect', portPath, baudRate),
    disconnect: () => ipcRenderer.invoke('morse:disconnect'),
    send: (payload) => ipcRenderer.invoke('morse:send', payload),
    onData: (callback) => {
      const handler = (_, data) => callback(data)
      ipcRenderer.on('morse:data', handler)
      return () => ipcRenderer.removeListener('morse:data', handler)
    },
    onStatus: (callback) => {
      const handler = (_, status) => callback(status)
      ipcRenderer.on('morse:status', handler)
      return () => ipcRenderer.removeListener('morse:status', handler)
    },
    onPorts: (callback) => {
      const handler = (_, ports) => callback(ports)
      ipcRenderer.on('morse:ports', handler)
      return () => ipcRenderer.removeListener('morse:ports', handler)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('morseApi', api.morseApi)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.morseApi = api.morseApi
}
