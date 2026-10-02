import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './privacy.module.css'

export const metadata: Metadata = {
  title: 'Privacidad · Finanzas',
  description: 'Cómo se cifran tus datos.',
}

const STEPS = [
  'Escribes tu contraseña. Nunca sale de tu navegador.',
  'Tu navegador saca dos llaves de ella: una para entrar y otra para cifrar.',
  'A nuestro servidor solo llega la llave para entrar. Con ella no se puede descifrar nada.',
  'Cada gasto, ingreso o presupuesto se cifra en tu navegador antes de enviarse.',
  'Guardamos solo texto cifrado. Al volver a entrar, tu navegador lo descifra.',
]

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
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
            <li>Ingreso mensual y día de pago</li>
            <li>Gastos fijos y categorías</li>
            <li>Gastos e ingresos extra: monto, descripción y fecha</li>
            <li>Presupuestos e inversiones</li>
          </ul>
        </div>
        <div>
          <h2>Qué no se cifra</h2>
          <ul>
            <li>Tu email y tu nombre (para entrar y saludarte)</li>
            <li>El tipo de cada registro (gasto, ingreso, categoría…)</li>
            <li>Cuándo se creó o cambió cada registro</li>
          </ul>
        </div>
      </section>

      <section className={styles.warning}>
        <h2>Si olvidas tu contraseña</h2>
        <p>
          Tus datos no se pueden recuperar. Nadie más tiene la llave. Por ahora
          no hay forma de restablecerla.
        </p>
      </section>

      <p className={styles.back}>
        <Link href="/">Volver</Link>
      </p>
    </main>
  )
}
