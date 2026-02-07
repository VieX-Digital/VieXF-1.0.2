export function minimize() {
  window.electron.ipcRenderer.send("window-minimize")
}

export function toggleMaximize() {
  window.electron.ipcRenderer.send("window-toggle-maximize")
}

export function close() {
  window.electron.ipcRenderer.send("window-close")
}

export async function invoke({ channel, payload }) {
  return window.electron.ipcRenderer.invoke(channel, payload)
}
