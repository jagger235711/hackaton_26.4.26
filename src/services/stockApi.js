const SINA_API_BASE = '/api/sina'
const TENCENT_API_BASE = '/api/stock'
const SEARCH_API_BASE = '/api/search'

export async function fetchStockPrice(stockCode) {
  const fullCode = stockCode.startsWith('6') ? `sh${stockCode}` : `sz${stockCode}`
  
  // 尝试腾讯接口 (首选，通常更稳定)
  try {
    const tencentData = await fetchFromTencent(fullCode, stockCode)
    if (tencentData) return tencentData
  } catch (e) {
    console.warn('腾讯接口失败，尝试切换新浪...', e)
  }

  // 尝试新浪接口 (备选)
  try {
    const sinaData = await fetchFromSina(fullCode, stockCode)
    if (sinaData) return sinaData
  } catch (e) {
    console.warn('新浪接口失败，进入 Mock 模式...', e)
  }

  // 最终降级到 Mock 数据
  return getFallbackStock(stockCode)
}

async function fetchFromTencent(fullCode, stockCode) {
  const url = `${TENCENT_API_BASE}${fullCode}`
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const decoder = new TextDecoder('gbk')
  const text = decoder.decode(arrayBuffer)
  
  if (!text.includes('=')) return null

  const match = text.match(/="([^"]+)"/)
  if (!match || !match[1]) return null

  const data = match[1].split('~')
  // 腾讯接口索引: 1:名称, 3:当前价, 4:昨收价
  if (data.length < 5) return null

  const name = data[1]
  const price = parseFloat(data[3])
  const yesterday = parseFloat(data[4])

  if (isNaN(price) || isNaN(yesterday)) return null

  const change = price - yesterday
  const changePercent = (change / yesterday) * 100

  return {
    name,
    code: stockCode,
    price,
    change,
    changePercent,
    source: 'Tencent'
  }
}

async function fetchFromSina(fullCode, stockCode) {
  const url = `${SINA_API_BASE}${fullCode}`
  const response = await fetch(url, {
    headers: { 'Referer': 'https://finance.sina.com.cn' }
  })
  const arrayBuffer = await response.arrayBuffer()
  const decoder = new TextDecoder('gbk')
  const text = decoder.decode(arrayBuffer)

  if (!text.includes('=')) return null

  const match = text.match(/="([^"]+)"/)
  if (!match || !match[1]) return null

  const data = match[1].split(',')
  // 新浪接口索引: 0:名称, 1:今日开盘, 2:昨日收盘, 3:当前价
  if (data.length < 4) return null

  const name = data[0]
  const yesterday = parseFloat(data[2])
  const price = parseFloat(data[3])

  if (isNaN(price) || isNaN(yesterday)) return null

  const change = price - yesterday
  const changePercent = (change / yesterday) * 100

  return {
    name,
    code: stockCode,
    price,
    change,
    changePercent,
    source: 'Sina'
  }
}

function getFallbackStock(stockCode) {
  const fallbackData = {
    '600519': { name: '贵州茅台', change: 15.80, changePercent: 1.15 },
    '000858': { name: '五粮液', change: -3.20, changePercent: -0.85 },
    '601318': { name: '中国平安', change: 2.50, changePercent: 1.20 },
    '600036': { name: '招商银行', change: 0.85, changePercent: 0.45 },
    '000001': { name: '平安银行', change: -1.20, changePercent: -1.10 },
    '300750': { name: '宁德时代', change: 8.50, changePercent: 3.20 },
    '002594': { name: '比亚迪', change: -12.30, changePercent: -2.50 },
    '600900': { name: '长江电力', change: 1.20, changePercent: 0.65 },
  }

  const fallback = fallbackData[stockCode]
  if (fallback) {
    return {
      name: fallback.name,
      code: stockCode,
      price: 0,
      change: fallback.change,
      changePercent: fallback.changePercent,
      source: 'Mock'
    }
  }

  return {
    name: '未知股票',
    code: stockCode,
    price: 0,
    change: Math.random() > 0.5 ? Math.random() * 20 : -Math.random() * 20,
    changePercent: Math.random() > 0.5 ? Math.random() * 5 : -Math.random() * 5,
    source: 'Mock-Random'
  }
}

export const popularStocks = [
  { code: '600519', name: '贵州茅台' },
  { code: '000858', name: '五粮液' },
  { code: '601318', name: '中国平安' },
  { code: '600036', name: '招商银行' },
  { code: '000001', name: '平安银行' },
  { code: '300750', name: '宁德时代' },
  { code: '002594', name: '比亚迪' },
  { code: '600900', name: '长江电力' },
]

export async function searchStocks(keyword) {
  if (!keyword) return []
  
  // 1. 本地模糊匹配 (即时反馈)
  const localMatches = popularStocks.filter(s => 
    s.name.includes(keyword) || s.code.includes(keyword)
  )

  if (keyword.length < 2) return localMatches

  // 3. 尝试从腾讯搜索建议 API 获取全量市场数据
  try {
    const url = `${SEARCH_API_BASE}?q=${encodeURIComponent(keyword)}&t=all`
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    
    // 强制使用 GBK 解码，因为腾讯该接口历史悠久，基本全是 GBK
    const decoder = new TextDecoder('gbk')
    const text = decoder.decode(arrayBuffer)
    
    // 提取引号内的内容
    const match = text.match(/"([^"]+)"/)
    if (match && match[1]) {
      // 腾讯返回的结果行之间可能用 \n 或 \\n 分隔
      const lines = match[1].split(/\\n|\n/).filter(line => line.trim() && line.includes('~'))
      
      const apiResults = lines.map(line => {
        const parts = line.split('~')
        // 标准格式: 市场代码(sz300283)~名称(温州宏丰)~拼音(WZHF)~类型(GP-A)
        if (parts.length < 4) return null
        
        const rawCode = parts[0]
        const name = parts[1]
        const pinyin = parts[2]
        const type = parts[3]
        const code = rawCode.replace(/[^0-9]/g, '')
        
        if (!name || name === 'none' || name.trim() === '') return null
        
        // 映射资产类型
        const typeMap = {
          'GP-A': 'A股',
          'GP-B': 'B股',
          'ZS': '指数',
          'JJ': '基金',
          'QH': '期货',
          'BND': '债券'
        }
        
        return {
          code,
          name,
          pinyin,
          type: typeMap[type] || type,
          market: rawCode.substring(0, 2).toUpperCase(),
          source: 'SearchAPI'
        }
      }).filter(Boolean)
      
      // 合并结果并去重
      const combined = [...localMatches]
      apiResults.forEach(apiItem => {
        if (!combined.find(m => m.code === apiItem.code)) {
          combined.push(apiItem)
        }
      })
      
      return combined
    }
  } catch (e) {
    console.error('API 搜索异常:', e)
  }

  return localMatches
}
