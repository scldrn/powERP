'use client'

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GarantiaSheet } from '@/components/campo/GarantiaSheet'

interface VisitaGarantiasButtonProps {
  visitaId: string
  pdvId: string
  vitrinaId: string
}

export function VisitaGarantiasButton({
  visitaId,
  pdvId,
  vitrinaId,
}: VisitaGarantiasButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
        onClick={() => setOpen(true)}
      >
        <ShieldAlert size={16} />
        Registrar garantía
      </Button>

      <GarantiaSheet
        open={open}
        onOpenChange={setOpen}
        visitaId={visitaId}
        pdvId={pdvId}
        vitrinaId={vitrinaId}
      />
    </>
  )
}
