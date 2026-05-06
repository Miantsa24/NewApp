import axiosInstance from '../axiosInstance'
import { parseXML } from '../xmlParser'

export const getAllOrders = async () => {
  const response = await axiosInstance.get('/orders')
  return parseXML(response.data)
}

export const getOrderById = async (id) => {
  const response = await axiosInstance.get(`/orders/${id}?language=1`) // 👈 ajout
  return parseXML(response.data)
}