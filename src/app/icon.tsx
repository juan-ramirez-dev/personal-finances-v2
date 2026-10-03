import { ImageResponse } from 'next/og'
import { BRAND_COLORS } from '@/lib/constants/colors'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// "L" dibujada con dos trazos: ImageResponse no trae Bodoni sin cargar la fuente.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_COLORS.primary,
          borderRadius: 4,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 13,
            height: 18,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 2,
              top: 0,
              width: 3,
              height: 18,
              background: BRAND_COLORS.cream,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 2,
              bottom: 0,
              width: 11,
              height: 2,
              background: BRAND_COLORS.cream,
            }}
          />
        </div>
      </div>
    ),
    size,
  )
}
