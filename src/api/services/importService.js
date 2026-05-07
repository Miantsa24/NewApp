import Papa from 'papaparse'
import axiosInstance from '../axiosInstance'
import { rowToXml } from '../utils/csvToXml'
import { MODULES_CONFIG } from '../utils/modulesConfig'

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 300
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const parseCsvFile = (file, delimiter = ';') => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`Erreur CSV : ${results.errors[0].message}`))
        } else {
          resolve(results.data)
        }
      },
      error: (err) => reject(err),
    })
  })
}

const sendOne = async (row, moduleKey) => {
  const config = MODULES_CONFIG[moduleKey]
  if (!config) throw new Error(`Module inconnu : ${moduleKey}`)
  const xml = rowToXml(row, moduleKey)
  await axiosInstance.post(`/${config.apiEndpoint}`, xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}

export const importCsv = async (rows, moduleKey, onProgress) => {
  const results = { success: 0, errors: [] }
  const total = rows.length

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (row, idx) => {
        try {
          await sendOne(row, moduleKey)
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
    if (i + BATCH_SIZE < total) await sleep(BATCH_DELAY_MS)
  }

  return results
}