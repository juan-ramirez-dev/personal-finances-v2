import type { Metadata } from 'next'
import Link from 'next/link'
import reveal from '@/components/ui/reveal.module.css'
import styles from './privacy.module.css'

export const metadata: Metadata = {
  title: 'Privacidad · Lucka',
  description: 'Cómo se cifran tus datos.',
}

const STEPS = [
  'Escribes tu contraseña. Nunca sale de tu navegador.',
  'Tu navegador saca dos llaves de ella: una para entrar y otra para cifrar.',
  'A nuestro servidor solo llega la llave para entrar. Con ella no se puede descifrar nada.',
  'Cada gasto, ingreso o presupuesto se cifra en tu navegador antes de enviarse.',
  'Guardamos solo texto cifrado. Al volver a entrar, tu navegador lo descifra.',
  'Tus códigos de recuperación guardan otra copia de la llave, cerrada con cada código.',
]

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={`${reveal.reveal} ${styles.header}`}>
        <p className={styles.eyebrow}>Privacidad</p>
        <h1 className={styles.title}>Tus datos se cifran con tu contraseña.</h1>
        <p className={styles.lead}>
          Ni nosotros ni nadie con acceso al servidor puede leer tus finanzas.
          Solo tú, con tu contraseña.
        </p>
      </header>

      <section className={styles.section}>
        <h2>Cómo funciona</h2>
        <ol className={styles.steps}>
          {STEPS.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className={styles.columns}>
        <div>
          <h2>Qué se cifra</h2>
          <ul>
            <li>Ingreso mensual</li>
            <li>Nombres y montos de gastos fijos y categorías</li>
            <li>Gastos e ingresos extra: monto y descripción</li>
            <li>Presupuestos, aporte y saldo de inversiones</li>
          </ul>
        </div>
        <div>
          <h2>Qué no se cifra</h2>
          <ul>
            <li>Tu email y tu nombre (para entrar y saludarte)</li>
            <li>Fechas de gastos e ingresos, y tus días de pago</li>
            <li>Qué gasto va a qué categoría o gasto fijo</li>
            <li>Si tienes inversiones (no cuánto)</li>
            <li>Cuándo se creó o borró cada registro</li>
          </ul>
        </div>
      </section>

      <section className={styles.warning}>
        <h2>Si olvidas tu contraseña</h2>
        <p>
          Al crear la cuenta te damos 4 códigos de recuperación. Con cualquiera
          pones una contraseña nueva y tus datos siguen ahí. Cada código sirve
          una vez y te damos otro al usarlo.
        </p>
        <p>
          Los códigos se crean en tu navegador. Nosotros solo guardamos una
          huella que no sirve para descifrar. Puedes verlos o cambiarlos en
          Ajustes.
        </p>
        <p>
          Sin tu contraseña y sin un código, nadie puede abrir tus datos. Ni
          nosotros.
        </p>
      </section>

      <p className={styles.back}>
        <Link href="/">Volver</Link>
      </p>
    </main>
  )
}
