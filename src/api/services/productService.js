import axiosInstance from '../axiosInstance'
import { parseXML } from '../xmlParser'

export const getAllProducts = async () => {
  const response = await axiosInstance.get('/products')
  return parseXML(response.data)
}

export const getProductById = async (id) => {
  const response = await axiosInstance.get(`/products/${id}?language=1`) // 👈 ajout
  return parseXML(response.data)
}