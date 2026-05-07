import axiosInstance from '../axiosInstance'
import { parseXML } from '../xmlParser'

export const getAllStock = async () => {
  const response = await axiosInstance.get('/stock_availables')
  return parseXML(response.data)
}

export const getStockById = async (id) => {
  const response = await axiosInstance.get(`/stock_availables/${id}`)
  return parseXML(response.data)
}