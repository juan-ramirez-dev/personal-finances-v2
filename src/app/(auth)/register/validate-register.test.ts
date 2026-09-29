import { validateRegister } from './validate-register'

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

const valid = {
  fullName: 'Ana',
  email: 'ana@finanzas.co',
  password: 'secreto1',
  confirmPassword: 'secreto1',
}

describe('validateRegister', () => {
  it('rechaza cuando las contraseñas no coinciden', () => {
    const result = validateRegister(
      form({ ...valid, confirmPassword: 'otra-clave' }),
    )
    expect(result).toEqual({ ok: false, error: 'Las contraseñas no coinciden' })
  })

  it('rechaza una contraseña de menos de 6 caracteres', () => {
    const result = validateRegister(
      form({ ...valid, password: '12345', confirmPassword: '12345' }),
    )
    expect(result.ok).toBe(false)
  })

  it('rechaza nombre o email con solo espacios', () => {
    expect(validateRegister(form({ ...valid, fullName: '   ' })).ok).toBe(false)
    expect(validateRegister(form({ ...valid, email: '   ' })).ok).toBe(false)
  })

  it('devuelve el email sin espacios y en minúsculas', () => {
    const result = validateRegister(
      form({ ...valid, email: '  Ana@Finanzas.CO ' }),
    )
    expect(result).toEqual({
      ok: true,
      data: {
        fullName: 'Ana',
        email: 'ana@finanzas.co',
        password: 'secreto1',
      },
    })
  })
})
