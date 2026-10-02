import { ApiError } from '../errors'
import type { Ctx } from '../http'
import { getSettings, markOnboarded, upsertSettings } from './repo'
import type { SettingsInput } from './schema'

export function saveSettings({ db, user }: Ctx, input: SettingsInput) {
  return upsertSettings(db, user.id, input)
}

// El onboarding se guarda paso a paso. Este es el último: abre el panel.
export async function completeOnboarding({ db, user }: Ctx) {
  const settings = await getSettings(db, user.id)
  if (!settings) throw new ApiError(422, 'Primero guarda tu ingreso')
  if (settings.onboarded) {
    throw new ApiError(409, 'El onboarding ya está completo')
  }
  await markOnboarded(db, user.id)
}
