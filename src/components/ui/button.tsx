import type { ButtonHTMLAttributes } from 'react'
import styles from './button.module.css'

type Variant = 'primary' | 'ink' | 'ghost' | 'link'

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ')
  return <button className={classes} {...props} />
}
