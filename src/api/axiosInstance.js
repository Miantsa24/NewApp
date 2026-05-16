import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/xml',
    'Accept': 'application/xml',
  },
  auth: {
    username: '1IDU11LNUDEB1E3HN538MK8C8W9Y6J3N', 
    password: ''
  }
})

export default axiosInstance