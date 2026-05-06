// import axiosInstance from '../axiosInstance'
// import { parseXML } from '../xmlParser'

// export const getAllStocks = async () => {
//   const response = await axiosInstance.get('/stocks')
//   return parseXML(response.data)
// }

// export const getStockById = async (id) => {
//   const response = await axiosInstance.get(`/stocks/${id}?language=1`) // 👈 ajout
//   return parseXML(response.data)
// }

// export const deleteStockById = async (id) => {
//   await axiosInstance.delete(`/stocks/${id}`)
// }

// export const deleteAllStocks = async () => {
//   const data = await getAllStocks()
//   const stocksList = data?.prestashop?.stocks?.stock
//   if (!stocksList) return
//   const stocksArray = Array.isArray(stocksList) ? stocksList : [stocksList]
//   await Promise.all(stocksArray.map((s) => deleteStockById(s['@_id'])))
// }