'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface AddCategoryModalProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function AddCategoryModal({ onSuccess, onCancel }: AddCategoryModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [icon, setIcon] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sugerencias de iconos comunes
  const iconSuggestions = {
    expense: ['🍔', '🚗', '🏠', '💊', '🎮', '👕', '✈️', '🎬', '📱', '⚡'],
    income: ['💰', '💵', '🎁', '📈', '💼', '🏆', '⭐', '✨', '🎯', '💎']
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('No hay sesión activa')
      setLoading(false)
      return
    }

    // Verificar si la categoría ya existe
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('name', name.trim())
      .eq('type', type)
      .single()

    if (existing) {
      setError('Ya existe una categoría con ese nombre')
      setLoading(false)
      return
    }

    // Crear nueva categoría
    const { error: insertError } = await supabase
      .from('categories')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        type,
        icon: icon || '📌',
        is_default: false,
        is_active: true
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    onSuccess()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Nueva Categoría</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2 rounded-md ${
                  type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-200'
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 rounded-md ${
                  type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}
              >
                Ingreso
              </button>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la categoría
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Ej: Gimnasio, Mascotas, Uber..."
              required
              maxLength={50}
            />
          </div>

          {/* Icono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icono (opcional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center text-2xl"
                placeholder="😊"
                maxLength={2}
              />
              <div className="w-12 h-12 border border-gray-300 rounded-md flex items-center justify-center text-2xl bg-gray-50">
                {icon || '📌'}
              </div>
            </div>
            
            {/* Sugerencias de iconos */}
            <div className="grid grid-cols-10 gap-1">
              {iconSuggestions[type].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className="w-8 h-8 text-xl hover:bg-gray-100 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

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
              disabled={loading || !name.trim()}
              className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}