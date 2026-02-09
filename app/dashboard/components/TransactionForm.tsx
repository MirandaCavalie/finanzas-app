'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getExchangeRate, getCurrencyCode } from '../../lib/exchangeRate'

interface Category {
  id: string
  name: string
  type: string
}

interface PaymentMethod {
  id: string
  name: string
}

interface Account {
  id: string
  name: string
}

interface Currency {
  id: string
  code: string
  symbol: string
}

interface TransactionFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function TransactionForm({ onSuccess, onCancel }: TransactionFormProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])

  useEffect(() => {
    loadFormData()
  }, [])

  // Calcular conversión cuando cambia el monto o la moneda
  useEffect(() => {
    calculateConversion()
  }, [amount, currencyId, currencies])

  const loadFormData = async () => {
    const [categoriesRes, paymentMethodsRes, accountsRes, currenciesRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('payment_methods').select('*').order('name'),
      supabase.from('accounts').select('*').order('name'),
      supabase.from('currencies').select('*')
    ])

    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (paymentMethodsRes.data) setPaymentMethods(paymentMethodsRes.data)
    if (accountsRes.data) setAccounts(accountsRes.data)
    if (currenciesRes.data) {
      setCurrencies(currenciesRes.data)
      const usd = currenciesRes.data.find(c => c.code === 'USD')
      if (usd) setCurrencyId(usd.id)
    }
  }

  const calculateConversion = async () => {
    if (!amount || !currencyId || currencies.length === 0) {
      setConvertedAmount(null)
      setExchangeRate(null)
      return
    }

    const selectedCurrency = currencies.find(c => c.id === currencyId)
    if (!selectedCurrency) return

    // Si ya es USD, no hay conversión
    if (selectedCurrency.code === 'USD') {
      setConvertedAmount(parseFloat(amount))
      setExchangeRate(1)
      return
    }

    // Obtener tipo de cambio
    const rate = await getExchangeRate(selectedCurrency.code, 'USD')
    
    if (rate) {
      setExchangeRate(rate)
      setConvertedAmount(parseFloat(amount) * rate)
    } else {
      setConvertedAmount(null)
      setExchangeRate(null)
    }
  }

  const filteredCategories = categories.filter(c => c.type === type)

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

    const transactionAmount = parseFloat(amount)

    // Obtener código de moneda seleccionada
    const currencyCode = await getCurrencyCode(currencyId)
    
    if (!currencyCode) {
      setError('Moneda no válida')
      setLoading(false)
      return
    }

    // Calcular amount_in_base (siempre en USD)
    let amountInBase = transactionAmount
    let rateUsed = 1

    if (currencyCode !== 'USD') {
      const rate = await getExchangeRate(currencyCode, 'USD')
      
      if (!rate) {
        setError('No se pudo obtener el tipo de cambio. Intenta de nuevo.')
        setLoading(false)
        return
      }

      amountInBase = transactionAmount * rate
      rateUsed = rate
    }

    // Insertar la transacción
    const { error: insertError } = await supabase.from('transactions').insert({
      user_id: session.user.id,
      type,
      amount: transactionAmount,
      amount_in_base: amountInBase,
      exchange_rate_used: rateUsed,
      description,
      category_id: categoryId || null,
      payment_method_id: paymentMethodId || null,
      account_id: accountId || null,
      currency_id: currencyId || null,
      date
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Actualizar el balance de la cuenta si se seleccionó una
    if (accountId) {
      // Obtener el balance actual de la cuenta
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', accountId)
        .single()

      if (accountError) {
        setError('Error al obtener la cuenta: ' + accountError.message)
        setLoading(false)
        return
      }

      // Calcular el nuevo balance (en la moneda de la transacción)
      const currentBalance = account.balance || 0
      const newBalance = type === 'income' 
        ? currentBalance + transactionAmount 
        : currentBalance - transactionAmount

      // Actualizar el balance
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', accountId)

      if (updateError) {
        setError('Error al actualizar el balance: ' + updateError.message)
        setLoading(false)
        return
      }
    }

    onSuccess()
    setLoading(false)
  }

  const selectedCurrency = currencies.find(c => c.id === currencyId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Nueva Transaccion</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-md ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-md ${type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
            >
              Ingreso
            </button>
          </div>

          {/* Monto y Moneda */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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

          {/* Mostrar conversión a USD si es otra moneda */}
          {selectedCurrency && selectedCurrency.code !== 'USD' && convertedAmount !== null && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Equivalente en USD:</span> ${convertedAmount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tipo de cambio: 1 {selectedCurrency.code} = ${exchangeRate?.toFixed(4)} USD
              </p>
            </div>
          )}

          {/* Descripcion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Ej: Almuerzo con amigos"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccionar...</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          {/* Metodo de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pago</label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccionar...</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>

          {/* Cuenta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccionar...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
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