'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import TransactionForm from './components/TransactionForm'
import MonthlyConfigModal from './components/MonthlyConfigModal'
import MonthlyBudgetCard from './components/MonthlyBudgetCard'
import AddCategoryModal from './components/AddCategoryModal'
import DashboardStats from './components/DashboardStats'

interface Category {
  id: string
  name: string
  icon: string
  type: string
}

interface Account {
  id: string
  name: string
  type: string
  balance: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  amount_in_base: number | null
  description: string
  date: string
  categories: { name: string } | null
  currencies: { code: string; symbol: string } | null
}

interface MonthlyConfig {
  fixed_income: number
  savings_percent: number
  currency_id: string
}

interface CategoryExpense {
  name: string
  value: number
  color: string
}

interface MonthlyData {
  month: string
  gastos: number
  presupuesto: number
  ahorro: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyConfig, setMonthlyConfig] = useState<MonthlyConfig | null>(null)
  const [spentThisMonth, setSpentThisMonth] = useState(0)
  const [categoriesExpenses, setCategoriesExpenses] = useState<CategoryExpense[]>([])
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/auth/login')
      return
    }

    setUser(session.user)
    await loadData()
    setLoading(false)
  }

  const loadData = async () => {
    await Promise.all([
      loadCategories(),
      loadAccounts(),
      loadTransactions(),
      loadMonthlyConfig(),
      loadMonthlyExpenses(),
      loadCategoryExpenses(),
      loadMonthlyComparison()
    ])
  }

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  const loadAccounts = async () => {
    const { data } = await supabase.from('accounts').select('*').order('name')
    if (data) setAccounts(data)
  }

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, categories(name), currencies(code, symbol)')
      .order('date', { ascending: false })
      .limit(10)
    
    if (data) setTransactions(data)
  }

  const loadMonthlyConfig = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const { data } = await supabase
      .from('monthly_config')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('month', currentMonth)
      .single()

    if (data) {
      setMonthlyConfig(data)
    } else {
      setShowConfigModal(true)
    }
  }

  const loadMonthlyExpenses = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const firstDayStr = firstDay.toISOString().split('T')[0]
    const lastDayStr = lastDay.toISOString().split('T')[0]

    const { data } = await supabase
      .from('transactions')
      .select('amount, amount_in_base, currencies(code)')
      .eq('user_id', session.user.id)
      .eq('type', 'expense')
      .gte('date', firstDayStr)
      .lte('date', lastDayStr)

    if (data) {
      let total = 0
      
      for (const transaction of data) {
        if (transaction.amount_in_base !== null) {
          total += transaction.amount_in_base
        } else {
          const currencyCode = (transaction.currencies as any)?.code || 'USD'
          if (currencyCode === 'USD') {
            total += transaction.amount
          }
        }
      }
      
      setSpentThisMonth(total)
    }
  }

  const loadCategoryExpenses = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const firstDayStr = firstDay.toISOString().split('T')[0]
    const lastDayStr = lastDay.toISOString().split('T')[0]

    const { data } = await supabase
      .from('transactions')
      .select('amount_in_base, categories(name)')
      .eq('user_id', session.user.id)
      .eq('type', 'expense')
      .gte('date', firstDayStr)
      .lte('date', lastDayStr)
      .not('amount_in_base', 'is', null)

    if (data) {
      const categoryMap: { [key: string]: number } = {}
      
      data.forEach(t => {
        const catName = (t.categories as any)?.name || 'Sin categoría'
        categoryMap[catName] = (categoryMap[catName] || 0) + (t.amount_in_base || 0)
      })

      const categoryArray = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value,
        color: '#000'
      }))

      setCategoriesExpenses(categoryArray)
    }
  }

  const loadMonthlyComparison = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const monthlyData: MonthlyData[] = []
    const now = new Date()

    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth()
      
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]
      const configMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`

      // Obtener configuración del mes
      const { data: config } = await supabase
        .from('monthly_config')
        .select('fixed_income, savings_percent')
        .eq('user_id', session.user.id)
        .eq('month', configMonth)
        .single()

      // Obtener gastos del mes
      const { data: expenses } = await supabase
        .from('transactions')
        .select('amount_in_base')
        .eq('user_id', session.user.id)
        .eq('type', 'expense')
        .gte('date', firstDay)
        .lte('date', lastDay)
        .not('amount_in_base', 'is', null)

      const totalExpenses = expenses?.reduce((sum, t) => sum + (t.amount_in_base || 0), 0) || 0
      
      if (config) {
        const savingsGoal = config.fixed_income * (config.savings_percent / 100)
        const budget = config.fixed_income - savingsGoal
        const actualSavings = budget - totalExpenses

        monthlyData.push({
          month: date.toLocaleDateString('es', { month: 'short' }),
          gastos: totalExpenses,
          presupuesto: budget,
          ahorro: actualSavings
        })
      }
    }

    setMonthlyComparison(monthlyData)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleTransactionSuccess = () => {
    setShowTransactionForm(false)
    loadData()
  }

  const handleConfigSuccess = () => {
    setShowConfigModal(false)
    loadData()
  }

  const handleCategorySuccess = () => {
    setShowAddCategoryModal(false)
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  const savingsGoal = monthlyConfig ? monthlyConfig.fixed_income * (monthlyConfig.savings_percent / 100) : 0
  const budget = monthlyConfig ? monthlyConfig.fixed_income - savingsGoal : 0
  const actualSavings = budget - spentThisMonth

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Finanzas Personales</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Boton agregar transaccion */}
        <div className="mb-6">
          <button
            onClick={() => setShowTransactionForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            + Agregar Transaccion
          </button>
        </div>

        {/* Presupuesto del Mes */}
        {monthlyConfig && (
          <div className="mb-6">
            <MonthlyBudgetCard
              fixedIncome={monthlyConfig.fixed_income}
              savingsPercent={monthlyConfig.savings_percent}
              spentThisMonth={spentThisMonth}
              onEdit={() => setShowConfigModal(true)}
            />
          </div>
        )}

        {/* Dashboard de Estadísticas */}
        {monthlyConfig && (
          <div className="mb-6">
            <DashboardStats
              categoriesExpenses={categoriesExpenses}
              monthlyComparison={monthlyComparison}
              totalSpent={spentThisMonth}
              budget={budget}
              savingsGoal={savingsGoal}
              actualSavings={actualSavings}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Cuentas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Mis Cuentas</h2>
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>{account.name}</span>
                  <span className={account.balance >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    ${account.balance.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Categorias */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Categorias</h2>
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                + Agregar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <div key={category.id} className="p-2 bg-gray-50 rounded text-sm flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span className={category.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Ultimas transacciones */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Ultimas Transacciones</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay transacciones aun. Agrega tu primera transaccion!</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const currencySymbol = transaction.currencies?.symbol || '$'
                const currencyCode = transaction.currencies?.code || 'USD'
                const showConversion = currencyCode !== 'USD' && transaction.amount_in_base

                return (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{transaction.description || 'Sin descripcion'}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.categories?.name || 'Sin categoria'} - {transaction.date}
                      </p>
                      {showConversion && (
                        <p className="text-xs text-blue-600 mt-1">
                          ≈ ${transaction.amount_in_base?.toFixed(2)} USD
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={transaction.type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {transaction.type === 'income' ? '+' : '-'}{currencySymbol}{transaction.amount.toFixed(2)}
                      </span>
                      {currencyCode !== 'USD' && (
                        <p className="text-xs text-gray-500">{currencyCode}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de transacción */}
      {showTransactionForm && (
        <TransactionForm
          onSuccess={handleTransactionSuccess}
          onCancel={() => setShowTransactionForm(false)}
        />
      )}

      {/* Modal de configuración mensual */}
      {showConfigModal && (
        <MonthlyConfigModal
          onSuccess={handleConfigSuccess}
          onCancel={() => setShowConfigModal(false)}
          existingConfig={monthlyConfig}
        />
      )}

      {/* Modal de agregar categoría */}
      {showAddCategoryModal && (
        <AddCategoryModal
          onSuccess={handleCategorySuccess}
          onCancel={() => setShowAddCategoryModal(false)}
        />
      )}
    </div>
  )
}