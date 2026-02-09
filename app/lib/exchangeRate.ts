import { supabase } from './supabase'
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'

interface ExchangeRateResponse {
  rates: {
    [key: string]: number
  }
  date: string
}

/**
 * @param toCurrencyCode Código de moneda destino (ej: 'PEN', 'EUR')
 * @returns Tipo de cambio o null si hay error
 */
export async function getExchangeRate(
  fromCurrencyCode: string,
  toCurrencyCode: string
): Promise<number | null> {
  try {
    if (fromCurrencyCode === toCurrencyCode) {
      return 1
    }

    const today = new Date().toISOString().split('T')[0]
    
    const { data: currencies } = await supabase
      .from('currencies')
      .select('id, code')
      .in('code', [fromCurrencyCode, toCurrencyCode])

    if (!currencies || currencies.length !== 2) {
      console.error('No se encontraron las monedas')
      return null
    }

    const fromCurrency = currencies.find(c => c.code === fromCurrencyCode)
    const toCurrency = currencies.find(c => c.code === toCurrencyCode)

    if (!fromCurrency || !toCurrency) {
      return null
    }

    const { data: existingRate } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency_id', fromCurrency.id)
      .eq('to_currency_id', toCurrency.id)
      .eq('date', today)
      .single()

    if (existingRate) {
      console.log(`Tipo de cambio encontrado en BD: ${fromCurrencyCode} → ${toCurrencyCode} = ${existingRate.rate}`)
      return existingRate.rate
    }

    console.log('Obteniendo tipo de cambio de la API...')
    const response = await fetch(EXCHANGE_API_URL)
    
    if (!response.ok) {
      throw new Error('Error al obtener tipo de cambio de la API')
    }

    const data: ExchangeRateResponse = await response.json()

    let rate: number
    
    if (fromCurrencyCode === 'USD') {
      rate = data.rates[toCurrencyCode]
    } else if (toCurrencyCode === 'USD') {
      rate = 1 / data.rates[fromCurrencyCode]
    } else {
      //conversiones entre dos monedas que no son USD
      //ej: EUR → PEN = (USD → PEN) / (USD → EUR)
      rate = data.rates[toCurrencyCode] / data.rates[fromCurrencyCode]
    }

    if (!rate) {
      console.error(`No se encontró tipo de cambio para ${toCurrencyCode}`)
      return null
    }

    await supabase.from('exchange_rates').insert({
      from_currency_id: fromCurrency.id,
      to_currency_id: toCurrency.id,
      rate: rate,
      date: today,
      source: 'api'
    })

    console.log(`Tipo de cambio obtenido: ${fromCurrencyCode} → ${toCurrencyCode} = ${rate}`)
    return rate

  } catch (error) {
    console.error('Error al obtener tipo de cambio:', error)
    return null
  }
}

/**
 * @param amount Monto a convertir
 * @param fromCurrencyCode Código de moneda origen
 * @param toCurrencyCode Código de moneda destino
 * @returns Monto convertido o null si hay error
 */
export async function convertCurrency(
  amount: number,
  fromCurrencyCode: string,
  toCurrencyCode: string
): Promise<number | null> {
  const rate = await getExchangeRate(fromCurrencyCode, toCurrencyCode)
  
  if (rate === null) {
    return null
  }

  return amount * rate
}


export async function getCurrencyCode(currencyId: string): Promise<string | null> {
  const { data } = await supabase
    .from('currencies')
    .select('code')
    .eq('id', currencyId)
    .single()

  return data?.code || null
}