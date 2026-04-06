'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Store,
  Users,
  LogOut,
  Monitor,
  Warehouse,
  Map,
  ClipboardList,
  Settings2,
  AlertTriangle,
  ShieldAlert,
  Building2,
  ShoppingCart,
  FileBarChart2,
} from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import type { UserRol } from '@/lib/validations/usuarios'

interface NavItem {
  href: string
  icon: ElementType
  label: string
  roles?: UserRol[]
}

interface NavSection {
  id: string
  label: string | null
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'main',
    label: null,
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'supervisor', 'analista'] },
      { href: '/admin/reportes', icon: FileBarChart2, label: 'Reportes', roles: ['admin', 'supervisor', 'analista', 'compras'] },
    ],
  },
  {
    id: 'operations',
    label: 'Operación',
    items: [
      { href: '/admin/productos', icon: Package, label: 'Productos' },
      { href: '/admin/puntos-de-venta', icon: Store, label: 'Puntos de Venta' },
      { href: '/admin/vitrinas', icon: Monitor, label: 'Vitrinas' },
      { href: '/admin/inventario', icon: Warehouse, label: 'Inventario' },
      { href: '/admin/rutas', icon: Map, label: 'Rutas' },
      { href: '/admin/visitas', icon: ClipboardList, label: 'Visitas' },
    ],
  },
  {
    id: 'support',
    label: 'Soporte',
    items: [
      { href: '/admin/incidencias', icon: AlertTriangle, label: 'Incidencias', roles: ['admin', 'supervisor', 'analista'] },
      { href: '/admin/garantias', icon: ShieldAlert, label: 'Garantías', roles: ['admin', 'supervisor', 'analista', 'compras'] },
    ],
  },
  {
    id: 'commerce',
    label: 'Comercial',
    items: [
      { href: '/admin/proveedores', icon: Building2, label: 'Proveedores', roles: ['admin', 'supervisor', 'analista', 'compras'] },
      { href: '/admin/compras', icon: ShoppingCart, label: 'Compras', roles: ['admin', 'supervisor', 'analista', 'compras'] },
      { href: '/admin/usuarios', icon: Users, label: 'Usuarios', roles: ['admin'] },
    ],
  },
  {
    id: 'config',
    label: 'Config.',
    items: [
      { href: '/admin/formas-pago', icon: Settings2, label: 'Formas de pago', roles: ['admin'] },
    ],
  },
]

const ROL_LABEL: Record<UserRol, string> = {
  admin: 'Administrador',
  colaboradora: 'Colaboradora',
  supervisor: 'Supervisor',
  analista: 'Analista',
  compras: 'Compras',
}

interface AppSidebarProps {
  rol: UserRol
  user: {
    nombre: string
    email: string
    rol: UserRol
  }
}

export function AppSidebar({ rol, user }: AppSidebarProps) {
  const pathname = usePathname()
  const displayName = user.nombre || user.email
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border shrink-0">

      {/* Logo — altura alineada con el header */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--blue-600)' }}
          >
            <span
              className="text-[12px] font-black text-white"
              style={{ fontFamily: 'var(--font-jakarta, var(--font-geist-sans))' }}
            >
              R
            </span>
          </div>
          <div>
            <p
              className="text-[14px] font-bold leading-none"
              style={{
                color: 'var(--gray-900)',
                fontFamily: 'var(--font-jakarta, var(--font-geist-sans))',
                letterSpacing: '0.05em',
              }}
            >
              RUTERIA
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--gray-600)' }}>
              Operacion de rutas
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex flex-col flex-1 px-3 py-5 gap-0 overflow-y-auto">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter(
            (item) => !item.roles || item.roles.includes(rol)
          )
          if (items.length === 0) return null

          return (
            <div key={section.id} className="mb-5">
              {section.label && (
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.09em] px-3 mb-2"
                  style={{ color: 'var(--gray-600)' }}
                >
                  {section.label}
                </p>
              )}

              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                      ].join(' ')}
                    >
                      <Icon
                        size={16}
                        className="shrink-0"
                        style={{ color: isActive ? 'var(--blue-600)' : undefined }}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="h-px mx-4" style={{ background: 'var(--gray-200)' }} />

      {/* Usuario */}
      <div className="p-4">
        <div
          className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-default transition-colors hover:bg-sidebar-accent/50"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
            style={{ background: 'var(--blue-600)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-semibold truncate leading-tight"
              style={{ color: 'var(--gray-900)' }}
            >
              {displayName}
            </p>
            <p
              className="text-[11px] truncate leading-tight capitalize mt-0.5"
              style={{ color: 'var(--gray-600)' }}
            >
              {ROL_LABEL[user.rol] ?? user.rol}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
              style={{ color: 'var(--gray-600)' }}
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
