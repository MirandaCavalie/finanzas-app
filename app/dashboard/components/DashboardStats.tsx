'use client'

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardStatsProps {
  categoriesExpenses: Array<{ name: string; value: number; color: string }>
  monthlyComparison: Array<{ month: string; gastos: number; presupuesto: number; ahorro: number }>
  totalSpent: number
  budget: number
  savingsGoal: number
  actualSavings: number
}

export default function DashboardStats({
  categoriesExpenses,
  monthlyComparison,
  totalSpent,
  budget,
  savingsGoal,
  actualSavings
}: DashboardStatsProps) {
  
  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
  
  // Calcular métricas
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const currentDay = new Date().getDate()
  const daysRemaining = daysInMonth - currentDay
  const avgDailySpending = totalSpent / currentDay
  const projectedTotal = avgDailySpending * daysInMonth
  const projectedSavings = budget - projectedTotal
  const projectedSavingsPercent = (projectedSavings / (budget + savingsGoal)) * 100

  // Top categoría
  const topCategory = categoriesExpenses.reduce((max, cat) => 
    cat.value > max.value ? cat : max
  , categoriesExpenses[0] || { name: 'N/A', value: 0 })

  // Custom label para el pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="space-y-6">
      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Gasto Promedio Diario</p>
          <p className="text-2xl font-bold text-gray-900">${avgDailySpending.toFixed(2)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Categoría Principal</p>
          <p className="text-2xl font-bold text-red-600">{topCategory?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">${topCategory?.value.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Días Restantes</p>
          <p className="text-2xl font-bold text-blue-600">{daysRemaining}</p>
          <p className="text-xs text-gray-500">de {daysInMonth} días</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Ahorro Proyectado</p>
          <p className={`text-2xl font-bold ${projectedSavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${projectedSavings.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">{projectedSavingsPercent.toFixed(0)}% del ingreso</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gastos por Categoría */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Gastos por Categoría (Este Mes)</h3>
          {categoriesExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoriesExpenses}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoriesExpenses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No hay gastos este mes</p>
          )}
          
          {/* Leyenda personalizada */}
          {categoriesExpenses.length > 0 && (
            <div className="mt-4 space-y-2">
              {categoriesExpenses.map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{cat.name}</span>
                  </div>
                  <span className="font-semibold">${cat.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comparación mensual */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Gastos (Últimos 6 Meses)</h3>
          {monthlyComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
                <Bar dataKey="presupuesto" fill="#3b82f6" name="Presupuesto" />
                <Bar dataKey="ahorro" fill="#10b981" name="Ahorro Real" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No hay suficientes datos históricos</p>
          )}
        </div>
      </div>

      {/* Análisis de tendencia */}
      {monthlyComparison.length >= 2 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Análisis de Tendencia</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const lastMonth = monthlyComparison[monthlyComparison.length - 2]
              const currentMonth = monthlyComparison[monthlyComparison.length - 1]
              
              const spendingChange = ((currentMonth.gastos - lastMonth.gastos) / lastMonth.gastos) * 100
              const savingsChange = currentMonth.ahorro - lastMonth.ahorro
              
              const isImproving = spendingChange < 0 || savingsChange > 0

              return (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Cambio en Gastos</p>
                    <p className={`text-xl font-bold ${spendingChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {spendingChange > 0 ? '+' : ''}{spendingChange.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">vs mes anterior</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Cambio en Ahorro</p>
                    <p className={`text-xl font-bold ${savingsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {savingsChange > 0 ? '+' : ''}${savingsChange.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">vs mes anterior</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Tendencia General</p>
                    <p className={`text-xl font-bold ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
                      {isImproving ? '📈 Mejorando' : '📉 Empeorando'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isImproving ? 'Sigue así!' : 'Reduce gastos'}
                    </p>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}