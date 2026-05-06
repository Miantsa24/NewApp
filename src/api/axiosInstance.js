import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/xml',
    'Accept': 'application/xml',
  },
  auth: {
    username: '18DHRWFV4U1JYBDF18UTI8AF8WB91VE3', 
    password: ''
  }
})

export default axiosInstance