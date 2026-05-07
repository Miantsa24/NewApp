import Papa from 'papaparse'
import axiosInstance from '../axiosInstance'
import { rowToXml } from '../utils/csvToXml'

const BATCH_SIZE = 10

// Parse le fichier CSV → tableau d'objets JS
export const parseCsvFile = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,          // première ligne = noms de colonnes
      delimiter: ';',        // séparateur point-virgule
      skipEmptyLines: true,  // ignore les lignes vides
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`Erreur CSV : ${results.errors[0].message}`))
        } else {
          resolve(results.data)
        }
      },
      error: (err) => reject(err)
    })
  })
}

// Envoie un seul item vers PrestaShop
const sendOne = async (row, module) => {
  const xml = rowToXml(row, module)
  await axiosInstance.post(`/${module}`, xml, {
    headers: { 'Content-Type': 'application/xml' }
  })
}

// Pause entre les batches pour ne pas surcharger PrestaShop
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const importCsv = async (rows, module, onProgress) => {
  const results = { success: 0, errors: [] }
  const total = rows.length

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (row, idx) => {
        try {
          await sendOne(row, module)
          results.success++
        } catch (err) {
          results.errors.push({
            line: i + idx + 2,
            message: err.response?.data || err.message,
            row,
          })
        }
      })
    )

    const progress = Math.min(((i + BATCH_SIZE) / total) * 100, 100)
    onProgress(Math.round(progress), results)

    // 👇 pause de 300ms entre chaque batch
    if (i + BATCH_SIZE < total) await sleep(300)
  }

  return results

}