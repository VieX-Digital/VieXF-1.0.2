function getIpcRenderer() {
  return window?.electron?.ipcRenderer
}

export function minimize() {
  getIpcRenderer()?.send("window-minimize")
}

export function toggleMaximize() {
  getIpcRenderer()?.send("window-toggle-maximize")
}

export function close() {
  getIpcRenderer()?.send("window-close")
}

export async function invoke({ channel, payload }) {
  return getIpcRenderer().invoke(channel, payload)
}

export function sendIpc({ channel, payload }) {
  const ipc = getIpcRenderer()
  if (!ipc) return
  ipc.send(channel, payload)
}

export function onIpc({ channel, listener }) {
  const ipc = getIpcRenderer()
  if (!ipc || typeof listener !== "function") return () => {}

  const wrapped = (_, payload) => listener(payload)
  ipc.on(channel, wrapped)

  return () => {
    if (typeof ipc.off === "function") {
      ipc.off(channel, wrapped)
      return
    }
    if (typeof ipc.removeListener === "function") {
      ipc.removeListener(channel, wrapped)
      return
    }
    if (typeof ipc.removeAllListeners === "function") {
      ipc.removeAllListeners(channel)
    }
  }
}
