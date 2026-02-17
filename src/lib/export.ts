import { save } from '@tauri-apps/plugin-dialog'

export async function pickExportPath(defaultName: string) {
  return save({
    defaultPath: defaultName,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
}
