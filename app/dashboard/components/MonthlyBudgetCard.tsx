'use client'

interface MonthlyBudgetCardProps {
  fixedIncome: number
  savingsPercent: number
  spentThisMonth: number
  onEdit: () => void
}

export default function MonthlyBudgetCard({ 
  fixedIncome, 
  savingsPercent, 
  spentThisMonth,
  onEdit 
}: MonthlyBudgetCardProps) {
  const savingsGoal = fixedIncome * (savingsPercent / 100)
  const budget = fixedIncome - savingsGoal
  const remaining = budget - spentThisMonth
  const percentUsed = (spentThisMonth / budget) * 100

  // Determinar color de la barra según el porcentaje usado
  const getProgressColor = () => {
    if (percentUsed >= 90) return 'bg-red-500'
    if (percentUsed >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTextColor = () => {
    if (remaining < 0) return 'text-red-600'
    if (percentUsed >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Presupuesto del Mes</h2>
        <button
          onClick={onEdit}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Editar
        </button>
      </div>

      <div className="space-y-4">
        {/* Ingreso mensual */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Ingreso mensual</span>
          <span className="font-semibold">${fixedIncome.toFixed(2)}</span>
        </div>

        {/* Meta de ahorro */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Meta de ahorro ({savingsPercent}%)</span>
          <span className="font-semibold text-green-600">-${savingsGoal.toFixed(2)}</span>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-gray-200"></div>

        {/* Presupuesto disponible */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Presupuesto disponible</span>
          <span className="font-bold text-blue-600">${budget.toFixed(2)}</span>
        </div>

        {/* Gastado */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Gastado este mes</span>
          <span className="font-semibold text-red-600">-${spentThisMonth.toFixed(2)}</span>
        </div>

        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{percentUsed.toFixed(0)}% usado</span>
            <span>{Math.max(0, 100 - percentUsed).toFixed(0)}% restante</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Restante para gastar */}
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
          <span className="font-medium text-gray-700">Restante para gastar</span>
          <span className={`text-xl font-bold ${getTextColor()}`}>
            ${remaining.toFixed(2)}
          </span>
        </div>

        {/* Advertencias */}
        {remaining < 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">
              ⚠️ Has excedido tu presupuesto del mes en ${Math.abs(remaining).toFixed(2)}
            </p>
          </div>
        )}

        {remaining >= 0 && percentUsed >= 90 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-700">
              ⚠️ Te queda poco presupuesto. Controla tus gastos.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}