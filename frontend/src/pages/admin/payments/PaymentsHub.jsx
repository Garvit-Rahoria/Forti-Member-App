import { useSearchParams } from 'react-router-dom'
import PaymentsList from './PaymentsList'

export default function PaymentsHub() {
  const [params] = useSearchParams()
  const tab = params.get('tab') === 'methods' ? 'methods' : 'transactions'
  return <PaymentsList initialTab={tab} />
}
