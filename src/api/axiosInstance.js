import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/xml',
    'Accept': 'application/xml',
  },
  auth: {
    username: '5XHUMHXJI9BZ52DDZ8Y2IJ1WCF7V471A', 
    password: ''
  }
})

export default axiosInstance