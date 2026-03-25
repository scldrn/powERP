import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GarantiasTable } from '@/components/admin/GarantiasTable'
import { getHomeForRole } from '@/lib/auth/getHomeForRole'
import { ROLES } from '@/lib/validations/usuarios'
import type { UserRol } from '@/lib/validations/usuarios'

export default async function GarantiasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const rawRol = user.app_metadata?.rol
  if (!ROLES.includes(rawRol)) redirect('/login')

  const rol = rawRol as UserRol
  if (!['admin', 'supervisor', 'analista', 'compras'].includes(rol)) {
    redirect(getHomeForRole(rol))
  }

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Garantías</h1>
        <p className="text-sm text-slate-500 mt-1">
          Seguimiento de productos devueltos, asignación de responsables y resolución administrativa.
        </p>
      </div>
      <GarantiasTable rol={rol} />
    </main>
  )
}
