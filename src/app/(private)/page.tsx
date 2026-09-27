import { MOCK_USER } from '@/lib/mock/auth'
import { FinanceApp } from './finance-app'

export default function HomePage() {
  return <FinanceApp userName={MOCK_USER.name} />
}
