'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// onChange se llama con el valor debounced (300ms).
// El padre almacena el valor debounced para filtrar datos.
export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  // Ref para evitar que un onChange no-memoizado del padre cause loop infinito
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange })

  // Sincronizar con resets externos (e.g. "limpiar filtros")
  useEffect(() => {
    if (value !== localValue) setLocalValue(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      onChangeRef.current(localValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [localValue])

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  )
}
