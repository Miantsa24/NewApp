import { useParams, useLocation, useNavigate } from 'react-router-dom'
import FrontLayout from '../FrontLayout'

const OrderConfirmPage = () => {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  return (
    <FrontLayout>
      <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
          Commande confirmée !
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
          Référence : <strong>{state?.reference || `#${id}`}</strong>
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Total : <strong>{state?.totalTTC} Ar</strong>
        </p>
        <button
          onClick={() => navigate('/shop/products')}
          style={{
            padding: '10px 24px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600,
            cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Continuer mes achats
        </button>
      </div>
    </FrontLayout>
  )
}

export default OrderConfirmPage