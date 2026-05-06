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

export const deleteOrderById = async (id) => {
  await axiosInstance.delete(`/orders/${id}`)
}

export const deleteAllOrders = async () => {
  const data = await getAllOrders()
  const ordersList = data?.prestashop?.orders?.order
  if (!ordersList) return
  const ordersArray = Array.isArray(ordersList) ? ordersList : [ordersList]
  await Promise.all(ordersArray.map((o) => deleteOrderById(o['@_id'])))
}