// import { useEffect, useState } from 'react'
// import { getAllStocks, getStockById } from '../api/services/stocksService'
// import './List.css'

// const StocksList = () => {
//   const [stocks, setStocks] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState(null)

//   useEffect(() => {
//     const fetchStocks = async () => {
//       try {
//         const data = await getAllStocks()
//         const stockList = data?.prestashop?.stocks?.stock
//         const stocksArray = Array.isArray(stockList) ? stockList : [stockList]
//         const stocksDetails = await Promise.all(
//           stocksArray.map(async (stock) => {
//             const detail = await getStockById(stock['@_id'])
//             return detail?.prestashop?.stock
//           })
//         )
//         setStocks(stocksDetails)
//       } catch (err) {
//         setError(err.message)
//       } finally {
//         setLoading(false)
//       }
//     }
//     fetchStocks()
//   }, [])

//   if (loading) return <div className="loading">Chargement des stocks...</div>
//   if (error) return <div className="error">{error}</div>

//   return (
//     <div className="list-container">
//       <div className="list-header">
//         <h1>Stocks</h1>
//         <span className="badge">{stocks.length}</span>
//       </div>
//       <table className="list-table">
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>Nom</th>
//             <th>Prix</th>
//             <th>État</th>
//           </tr>
//         </thead>
//         <tbody>
//           {stocks.map((stock) => (
//             <tr key={stock['@_id'] || stock?.id}>
//               <td className="id-cell">#{stock?.id}</td>
//               <td className="name-cell">{stock?.name?.language?.['#text'] || '—'}</td>
//               <td className="price-cell">{parseFloat(stock?.price).toFixed(2)} €</td>
//               <td>
//                 <span className={`status ${stock?.active == 1 ? 'status-active' : 'status-inactive'}`}>
//                   {stock?.active == 1 ? 'Actif' : 'Inactif'}
//                 </span>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   )
// }

// export default StocksList