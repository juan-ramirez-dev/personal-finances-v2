import { FinanceProvider } from './finance-provider'

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <FinanceProvider>{children}</FinanceProvider>
}
