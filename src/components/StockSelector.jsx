import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { popularStocks, fetchStockPrice, searchStocks } from '../services/stockApi'

export default function StockSelector({ onSelect, selectedStock }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [previewResult, setPreviewResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])

  // 处理输入变化
  useEffect(() => {
    // 允许 1 位数字搜索，但 API 搜索通常需要 2 位以上
    if (searchTerm.length < 1) {
      setSearchResults([])
      setPreviewResult(null)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await searchStocks(searchTerm)
        setSearchResults(results)
        
        // 如果输入正好是 6 位数字，则尝试获取更详细的预览（带行情）
        if (searchTerm.length === 6 && /^\d+$/.test(searchTerm)) {
          const detail = await fetchStockPrice(searchTerm)
          if (detail && detail.name !== '未知股票' && detail.source !== 'Mock-Random') {
            setPreviewResult(detail)
          } else {
            setPreviewResult(null)
          }
        } else {
          setPreviewResult(null)
        }
      } catch (err) {
        console.error('搜索出错:', err)
      } finally {
        setIsLoading(false)
      }
    }, 500) // 增加到 500ms，平衡响应速度与 API 压力

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  // 获取市场信息
  const getMarketInfo = (code) => {
    if (code.startsWith('60')) return '上交所 主板'
    if (code.startsWith('68')) return '上交所 科创板'
    if (code.startsWith('00')) return '深交所 主板'
    if (code.startsWith('30')) return '深交所 创业板'
    if (code.startsWith('43') || code.startsWith('8')) return '北交所'
    return 'A股 证券'
  }

  const handleSelect = (stock) => {
    onSelect(stock)
    setIsOpen(false)
    setSearchTerm('')
    setPreviewResult(null)
    setSearchResults([])
  }

  // 显示的列表：有搜索词则显示搜索结果（即使是空的），否则显示热门
  const displayList = searchTerm.length > 0 ? searchResults : popularStocks

  return (
    <div className="w-full max-w-md">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full py-4 px-6 bg-neutral-800/80 hover:bg-neutral-700/80 rounded-xl border border-neutral-700 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-neutral-400" />
          <div className="text-left">
            <div className="text-neutral-400 text-sm">当前股票</div>
            <div className="text-white font-medium">
              {selectedStock ? `${selectedStock.name} (${selectedStock.code})` : '选择股票'}
            </div>
          </div>
        </div>
        <div className="text-neutral-500">切换</div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-neutral-900 rounded-3xl p-6 border border-neutral-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">选择股票</h3>
                <button onClick={() => setIsOpen(false)}>
                  <X className="w-6 h-6 text-neutral-400 hover:text-white" />
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="输入名称或代码 (如 600519)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-800 rounded-xl text-white placeholder-neutral-500 border border-neutral-700 focus:border-red-500/50 outline-none transition-all"
                />
                {isLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* 搜索预览区域 */}
              <AnimatePresence>
                {previewResult && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-6 p-4 bg-neutral-800/50 border border-neutral-700 rounded-2xl">
                      <div className="text-xs text-neutral-500 mb-3 uppercase tracking-wider">匹配结果预览</div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="text-white font-bold text-xl leading-none">{previewResult.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-500 text-sm font-mono">{previewResult.code}</span>
                            <span className="px-2 py-0.5 bg-neutral-700 text-neutral-400 text-[10px] rounded uppercase font-bold">
                              {getMarketInfo(previewResult.code)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <button 
                            onClick={() => handleSelect(previewResult)}
                            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-red-500/20 active:scale-95"
                          >
                            立即选中
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-neutral-700/50">
                        <p className="text-neutral-500 text-xs italic">
                          确认是这只股票吗？选中后即可开始揭秘...
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 px-1">
                  {searchTerm ? '匹配结果' : '热门股票'}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {displayList.map((stock) => (
                    <motion.button
                      key={stock.code}
                      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(stock)}
                      className="p-3 bg-neutral-800/30 hover:bg-neutral-800 rounded-xl text-left border border-neutral-800 flex items-center justify-between transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-bold truncate">
                            {stock.name || '未知股票'}
                          </span>
                          {stock.type && (
                            <span className="px-1.5 py-0.5 bg-neutral-700 text-neutral-400 text-[10px] rounded font-bold whitespace-nowrap">
                              {stock.type}
                            </span>
                          )}
                        </div>
                        <div className="text-neutral-500 text-xs font-mono flex items-center gap-2">
                          <span className="text-neutral-400">{stock.code}</span>
                          {stock.market && (
                            <span className="opacity-60 border-l border-neutral-700 pl-2">
                              {stock.market === 'SZ' ? '深圳' : stock.market === 'SH' ? '上海' : stock.market === 'BJ' ? '北京' : stock.market}
                            </span>
                          )}
                          {stock.pinyin && (
                            <span className="opacity-40 uppercase">{stock.pinyin}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-neutral-600 flex-shrink-0">
                        <TrendingUp size={14} />
                      </div>
                    </motion.button>
                  ))}
                  {displayList.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-neutral-600 text-sm">
                      未找到相关股票
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}