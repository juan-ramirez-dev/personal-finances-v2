import { ViewTransition } from 'react'

// Fundido entre el panel y Ajustes. La seguridad sigue en cada página (requireUser).
export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ViewTransition>{children}</ViewTransition>
}
