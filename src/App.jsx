import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence, useMotionValueEvent, animate } from 'framer-motion'
import { TrendingUp, TrendingDown, X, Loader2, MousePointer2, Eraser } from 'lucide-react'
import confetti from 'canvas-confetti'
import StockSelector from './components/StockSelector'
import CanvasScratchCard from './components/CanvasScratchCard'
import StockCardContent from './components/StockCardContent'
import { fetchStockPrice, popularStocks } from './services/stockApi'
import { useSound } from './hooks/useSound'

function ScratchCard({ onReveal, revealed, onProgressChange, onDragEnd, isDragging, stock }) {
  const cardRef = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const heat = useMotionValue(0)
  const [displayHeat, setDisplayHeat] = useState(0)

  // 同步 MotionValue 到 State 用于图标切换
  useMotionValueEvent(heat, "change", (latest) => {
    setDisplayHeat(latest)
  })

  // 核心 3D 转换：模拟纸牌搓动时的翻转、偏移和倾斜
  const rotateX = useTransform(y, [-400, 400], [15, -15])
  const rotateY = useTransform(x, [-400, 400], [-15, 15])
  const skewX = useTransform(x, [-400, 400], [-3, 3])
  const skewY = useTransform(y, [-400, 400], [-3, 3])
  
  // 搓的行程加长：从 280 增加到 350，让切换更难触发
  const threshold = 350

  const scale = useTransform(
    [x, y],
    ([latestX, latestY]) => {
      const distance = Math.sqrt(latestX ** 2 + latestY ** 2)
      return 1 - Math.min(distance / 2000, 0.15)
    }
  )
  // 搓牌卡片的透明度不再随距离变化（或者变化极小），主要靠“红温”看清
  const cardOpacity = useTransform(
    [x, y, heat],
    ([latestX, latestY, latestHeat]) => {
      const distance = Math.sqrt(latestX ** 2 + latestY ** 2)
      // 如果搓得极快（红温），顶层卡片变得半透明，露出底层
      const heatEffect = latestHeat / 150 
      const distanceEffect = Math.min(distance / 800, 0.2) 
      return 1 - Math.min(heatEffect + distanceEffect, 0.9)
    }
  )

  const springX = useSpring(x, { damping: 50, stiffness: 80 })
  const springY = useSpring(y, { damping: 50, stiffness: 80 })

  // 红温过载：根据速度计算热度
  const heatColor = useTransform(heat, [0, 60, 100], ["rgba(255,0,0,0)", "rgba(255,0,0,0.4)", "rgba(255,0,0,0.9)"])
  const glowSize = useTransform(heat, [0, 100], [0, 60])
  const shakeX = useTransform(heat, [0, 90, 100], [0, 0, 5])
  const shakeY = useTransform(heat, [0, 90, 100], [0, 0, -5])

  useEffect(() => {
    const unsubscribe = x.on("change", () => {
      const distance = Math.sqrt(x.get() ** 2 + y.get() ** 2)
      const p = Math.min(distance / threshold, 1)
      onProgressChange?.(p)
    })
    return unsubscribe
  }, [x, y, onProgressChange, threshold])

  const handleDrag = (event, info) => {
    const distance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2)
    
    // 计算速度并更新红温状态
    const velocity = Math.sqrt(info.velocity.x ** 2 + info.velocity.y ** 2)
    const newHeat = Math.min(velocity / 12, 100) // 调灵敏一点
    heat.set(newHeat)

    // 触发逻辑：搓到行程满（100% 进度）或 达到红温极限且有一定行程
    if (distance >= threshold || (newHeat >= 98 && distance > threshold * 0.6)) {
      onReveal()
    }
  }

  const handleDragEndAction = (event, info) => {
    heat.set(0)
    onDragEnd?.()
    // 增加松手后的回弹动画，确保卡片回到中心
    animate(x, 0, { type: "spring", damping: 20, stiffness: 200 })
    animate(y, 0, { type: "spring", damping: 20, stiffness: 200 })
  }

  const bgGradient = 'from-neutral-800 via-neutral-900 to-black'

  if (revealed) return null

  const isPositive = stock?.change >= 0;
  const textColor = isPositive ? 'text-red-500' : 'text-green-500';

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden rounded-2xl border-2 border-neutral-800 bg-black perspective-1000">
      {/* 底部真实预览 - 模拟第二张牌 */}
      <StockCardContent stock={stock} heatValue={displayHeat} />

      {/* 顶部覆盖牌 - 模拟第一张牌 */}
      <motion.div
        ref={cardRef}
        drag
        dragConstraints={{ left: -350, right: 350, top: -350, bottom: 350 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEndAction}
        dragTransition={{ bounceStiffness: 200, bounceDamping: 20 }}
        style={{ 
          x, 
          y,
          rotateX,
          rotateY,
          skewX,
          skewY,
          opacity: cardOpacity, 
          scale,
          translateX: shakeX,
          translateY: shakeY,
          boxShadow: `0 0 ${glowSize}px ${heatColor}`
        }}
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br ${bgGradient} cursor-grab active:cursor-grabbing border border-white/10 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden`}
      >
        {/* 红温过载覆盖层 */}
        <motion.div 
          style={{ backgroundColor: heatColor }}
          className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay transition-colors duration-100"
        />

        {/* 纸牌背面纹理 */}
        <div className="absolute inset-4 border-2 border-white/5 rounded-xl opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
        
        <div className="text-center relative z-20 pointer-events-none select-none">
          <motion.div 
            style={{ 
              scale: useTransform(heat, [0, 100], [1, 1.3]),
              filter: useTransform(heat, [0, 100], ["drop-shadow(0 0 0px red)", "drop-shadow(0 0 20px red)"])
            }}
            className="text-8xl mb-6"
          >
            {displayHeat > 70 ? '🔥' : '🀄'}
          </motion.div>
          
          <motion.div 
            animate={displayHeat > 90 ? { x: [-2, 2, -2], y: [1, -1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.1 }}
            className="text-white text-3xl font-black tracking-[0.3em] uppercase mb-2 drop-shadow-md"
          >
            {displayHeat > 80 ? 'OVERLOAD' : '股神搓牌'}
          </motion.div>
          
          <div className="flex items-center justify-center gap-2 text-white/30 text-xs font-bold uppercase tracking-widest">
            <span className="w-8 h-[1px] bg-white/10" />
            {displayHeat > 50 ? 'FASTERRRR!' : 'Slide Any Direction'}
            <span className="w-8 h-[1px] bg-white/10" />
          </div>

          {/* 进度提示条 */}
          <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
            <motion.div 
              style={{ 
                width: useTransform(
                  [x, y],
                  ([latestX, latestY]) => {
                    const distance = Math.sqrt(latestX ** 2 + latestY ** 2)
                    return `${Math.min((distance / threshold) * 100, 100)}%`
                  }
                ) 
              }}
              className="h-full bg-white/40 shadow-[0_0_10px_white]"
            />
          </div>
        </div>

        {/* 装饰边角 - 扑克牌效果 */}
        <div className="absolute top-4 left-4 text-white/10 text-2xl font-serif select-none">A</div>
        <div className="absolute bottom-4 right-4 text-white/10 text-2xl font-serif rotate-180 select-none">A</div>
        <div className="absolute top-4 right-4 text-white/10 text-2xl font-serif select-none">♠</div>
        <div className="absolute bottom-4 left-4 text-white/10 text-2xl font-serif rotate-180 select-none">♠</div>
      </motion.div>
    </div>
  )
}

function StockResult({ stock, revealed }) {
  if (!stock) return null

  const isPositive = stock.change >= 0
  // 切换红绿：涨红跌绿 (符合A股习惯)
  const textColor = isPositive ? 'text-red-500' : 'text-green-500'
  const borderColor = isPositive ? 'border-red-500/50' : 'border-green-500/50'
  const bgGradient = isPositive
    ? 'from-red-900/50 via-black to-black'
    : 'from-green-900/50 via-black to-black'
  const iconColor = isPositive ? 'text-red-500' : 'text-green-500'

  // 根据涨跌幅计算字体大小，基础 80px，最大 140px
  const absChange = Math.abs(stock.changePercent || 0)
  const fontSize = Math.min(80 + absChange * 5, 140)

  useEffect(() => {
    if (revealed && isPositive) {
      const duration = 3 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      const randomInRange = (min, max) => Math.random() * (max - min) + min

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [revealed, isPositive])

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={revealed ? { scale: 1, opacity: 1 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`w-full h-[400px] rounded-2xl border-2 ${borderColor} bg-gradient-to-b ${bgGradient} flex flex-col items-center justify-center p-8`}
    >
      <div className="text-neutral-400 text-xl mb-2">{stock.name}</div>
      <div className="text-neutral-600 text-lg mb-6">({stock.code})</div>

      <div 
        style={{ fontSize: `${fontSize}px` }}
        className={`leading-none font-black ${textColor} drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-500`}
      >
        {isPositive ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}
      </div>

      <div className={`mt-4 text-4xl font-bold ${textColor}`}>
        {isPositive ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
      </div>

      <div className="mt-6 flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className={`w-8 h-8 ${iconColor}`} />
        ) : (
          <TrendingDown className={`w-8 h-8 ${iconColor}`} />
        )}
        <span className="text-neutral-400 text-lg font-medium">
          {isPositive ? '红红火火' : '绿草如茵'}
        </span>
      </div>
    </motion.div>
  )
}

function ComfortButton({ onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="mt-8 px-12 py-4 bg-neutral-800 hover:bg-neutral-700 rounded-full text-xl font-bold text-neutral-300 border-2 border-neutral-700"
    >
      关灯吃面 🍜
    </motion.button>
  )
}

const COMFORT_QUOTES = [
  { title: "投资是一场修行", content: "暂时的亏损不代表什么，保持理性，继续前行。" },
  { title: "关灯吃面，来日再战", content: "面条虽苦，但这就是成长的味道。今晚好好休息。" },
  { title: "巴菲特也曾被套", content: "伟大的投资者不在于从不亏损，而在于亏损时依然冷静。" },
  { title: "市场总有波动", content: "不要因为一天的跌幅，否定了你长期的坚持。" },
  { title: "账户只是数字", content: "身体才是本钱。放下手机，去公园走走吧。" },
  { title: "宁静致远", content: "如果你不能承受 50% 的回撤，就不配拥有翻倍的收益。" },
  { title: "此时无声胜有声", content: "有时候，不操作就是最好的操作。深呼吸。" }
]

function DarkMode({ active, onClose }) {
  const [quote, setQuote] = useState(COMFORT_QUOTES[0])

  useEffect(() => {
    if (active) {
      const randomIndex = Math.floor(Math.random() * COMFORT_QUOTES.length)
      setQuote(COMFORT_QUOTES[randomIndex])
    }
  }, [active])

  if (!active) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="text-center max-w-lg"
      >
        <div className="text-8xl mb-8 filter grayscale opacity-60">🍜</div>
        <div className="text-3xl font-bold text-neutral-400 mb-4">
          {quote.title}
        </div>
        <div className="text-neutral-500 text-xl leading-relaxed italic">
          "{quote.content}"
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="mt-16 px-10 py-3 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          收拾心情，重新来过
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function App() {
  const [selectedStock, setSelectedStock] = useState(popularStocks[0])
  const [stockData, setStockData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [interactMode, setInteractMode] = useState('drag') // 'drag' or 'scratch'

  const { playScratch, playSuccess, playFail } = useSound()

  const fetchData = useCallback(async () => {
    if (!selectedStock) return
    setLoading(true)
    const data = await fetchStockPrice(selectedStock.code)
    setStockData(data || {
      name: selectedStock.name,
      code: selectedStock.code,
      change: 0,
      changePercent: 0,
    })
    setLoading(false)
  }, [selectedStock])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStockSelect = (stock) => {
    setSelectedStock(stock)
    setRevealed(false)
    setLoading(true)
    fetchStockPrice(stock.code).then((data) => {
      setStockData(data || {
        name: stock.name,
        code: stock.code,
        change: 0,
        changePercent: 0,
      })
      setLoading(false)
    })
  }

  const handleReveal = () => {
    if (loading || !stockData) return
    setRevealed(true)
    if (stockData.change >= 0) {
      playSuccess()
    } else {
      playFail()
    }
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  }

  const handleProgressChange = useCallback((p) => {
    setProgress(p)
    if (p > 0.3 && !isDragging) {
      setIsDragging(true)
      playScratch()
    }
  }, [isDragging, playScratch])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setProgress(0)
  }, [])

  const handleComfort = () => {
    setDarkMode(true)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }
  }

  return (
    <div className="min-h-screen bg-black p-6 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
          赚了吗？
        </h1>
        <p className="text-neutral-500 mt-2">滑动揭示你的今日收益</p>
      </motion.div>

      <StockSelector 
        onSelect={handleStockSelect} 
        selectedStock={selectedStock} 
      />

      <div className="w-full max-w-md mt-6">
        {loading ? (
          <div className="w-full h-[400px] rounded-2xl border-2 border-neutral-800 bg-neutral-900 flex flex-col items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Loader2 className="w-12 h-12 text-neutral-500" />
            </motion.div>
            <div className="text-neutral-500 mt-4">查询股价中...</div>
          </div>
        ) : revealed ? (
          <StockResult stock={stockData} revealed={revealed} />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-4 mb-2">
              <button
                onClick={() => setInteractMode('drag')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  interactMode === 'drag' 
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <MousePointer2 size={16} />
                <span className="text-sm font-bold">搓牌模式</span>
              </button>
              <button
                onClick={() => setInteractMode('scratch')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  interactMode === 'scratch' 
                    ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <Eraser size={16} />
                <span className="text-sm font-bold">刮刮卡模式</span>
              </button>
            </div>

            {interactMode === 'drag' ? (
               <ScratchCard 
                 onReveal={handleReveal} 
                 revealed={revealed} 
                 onProgressChange={handleProgressChange}
                 onDragEnd={handleDragEnd}
                 isDragging={isDragging}
                 stock={stockData}
               />
             ) : (
               <CanvasScratchCard 
                 onReveal={handleReveal}
                 revealed={revealed}
                 stock={stockData}
               />
             )}
          </div>
        )}

        {revealed && stockData && stockData.change < 0 && (
          <div className="flex justify-center">
            <ComfortButton onClick={handleComfort} />
          </div>
        )}
      </div>

      {revealed && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => { setRevealed(false); setDarkMode(false) }}
          className="mt-8 text-neutral-500 hover:text-neutral-300"
        >
          再试一次
        </motion.button>
      )}

      <DarkMode active={darkMode} onClose={() => setDarkMode(false)} />
    </div>
  )
}

export default App