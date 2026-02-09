'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Currency {
  id: string
  code: string
  symbol: string
}

interface MonthlyConfigModalProps {
  onSuccess: () => void
  onCancel: () => void
  existingConfig?: {
    fixed_income: number
    savings_percent: number
    currency_id: string
  } | null
}

export default function MonthlyConfigModal({ onSuccess, onCancel, existingConfig }: MonthlyConfigModalProps) {
  const [fixedIncome, setFixedIncome] = useState('')
  const [savingsPercent, setSavingsPercent] = useState('30')
  const [currencyId, setCurrencyId] = useState('')
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCurrencies()
    if (existingConfig) {
      setFixedIncome(existingConfig.fixed_income.toString())
      setSavingsPercent(existingConfig.savings_percent.toString())
      setCurrencyId(existingConfig.currency_id)
    }
  }, [existingConfig])

  const loadCurrencies = async () => {
    const { data } = await supabase.from('currencies').select('*')
    if (data) {
      setCurrencies(data)
      const usd = data.find(c => c.code === 'USD')
      if (usd && !currencyId) setCurrencyId(usd.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('No hay sesion activa')
      setLoading(false)
      return
    }

    // Obtener el primer día del mes actual
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    // Verificar si ya existe configuración para este mes
    const { data: existing } = await supabase
      .from('monthly_config')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('month', currentMonth)
      .single()

    if (existing) {
      // Actualizar configuración existente
      const { error: updateError } = await supabase
        .from('monthly_config')
        .update({
          fixed_income: parseFloat(fixedIncome),
          savings_percent: parseInt(savingsPercent),
          currency_id: currencyId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      // Crear nueva configuración
      const { error: insertError } = await supabase
        .from('monthly_config')
        .insert({
          user_id: session.user.id,
          month: currentMonth,
          fixed_income: parseFloat(fixedIncome),
          savings_percent: parseInt(savingsPercent),
          currency_id: currencyId
        })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    onSuccess()
    setLoading(false)
  }

  const budget = fixedIncome ? parseFloat(fixedIncome) * (1 - parseInt(savingsPercent) / 100) : 0
  const savings = fixedIncome ? parseFloat(fixedIncome) * (parseInt(savingsPercent) / 100) : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {existingConfig ? 'Editar Presupuesto Mensual' : 'Configurar Presupuesto del Mes'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ingreso fijo mensual */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingreso mensual fijo
              </label>
              <input
                type="number"
                step="0.01"
                value={fixedIncome}
                onChange={(e) => setFixedIncome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="1000"
                required
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>{currency.code}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Porcentaje de ahorro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Porcentaje de ahorro (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={savingsPercent}
              onChange={(e) => setSavingsPercent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Cuánto porcentaje de tu ingreso quieres ahorrar
            </p>
          </div>

          {/* Preview de cálculos */}
          {fixedIncome && (
            <div className="bg-blue-50 p-4 rounded-md space-y-2">
              <p className="text-sm font-medium text-gray-700">Resumen:</p>
              <div className="flex justify-between text-sm">
                <span>Ingreso mensual:</span>
                <span className="font-semibold">${parseFloat(fixedIncome).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Meta de ahorro ({savingsPercent}%):</span>
                <span className="font-semibold text-green-600">${savings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">Presupuesto disponible:</span>
                <span className="font-bold text-blue-600">${budget.toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Botones */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}