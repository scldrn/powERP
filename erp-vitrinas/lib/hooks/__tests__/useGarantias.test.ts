import { describe, expect, it, vi } from 'vitest'
import { enqueueCreateGarantia } from '@/lib/offline/queue'

vi.mock('@/lib/offline/queue', () => ({
  enqueueCreateGarantia: vi.fn(),
}))

describe('enqueueCreateGarantia', () => {
  it('encola la garantia con el payload esperado', async () => {
    const visitId = 'visit-1'
    const payload = {
      garantia_id: 'garantia-1',
      pdv_id: 'pdv-1',
      vitrina_id: 'vitrina-1',
      producto_id: 'producto-1',
      cantidad: 2,
      motivo: 'Defecto de fabrica',
      fecha_venta_aprox: null,
    }

    await enqueueCreateGarantia(visitId, payload)

    expect(enqueueCreateGarantia).toHaveBeenCalledWith(visitId, payload)
  })
})
