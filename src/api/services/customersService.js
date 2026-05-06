import axiosInstance from '../axiosInstance'
import { parseXML } from '../xmlParser'

export const getAllCustomers = async () => {
  const response = await axiosInstance.get('/customers')
  return parseXML(response.data)
}

export const getCustomerById = async (id) => {
  const response = await axiosInstance.get(`/customers/${id}?language=1`) // 👈 ajout
  return parseXML(response.data)
}