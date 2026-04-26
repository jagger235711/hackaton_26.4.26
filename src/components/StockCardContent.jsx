import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StockCardContent({ stock, heatValue = 100 }) {
  if (!stock) return null;

  const isPositive = stock.change >= 0;
  const textColor = isPositive ? 'text-red-500' : 'text-green-500';

  // 根据红温程度计算模糊度和透明度
  // heatValue 为 0-100，映射到 blur 10-0, opacity 0.2-1
  const blurValue = Math.max(10 - (heatValue / 10), 0);
  const opacityValue = 0.2 + (heatValue / 100) * 0.8;

  return (
    <div 
      style={{ 
        filter: `blur(${blurValue}px)`,
        opacity: opacityValue,
        transition: 'filter 0.1s ease-out, opacity 0.1s ease-out'
      }}
      className="absolute inset-0 flex flex-col items-center justify-center p-8 select-none"
    >
      <div className="text-neutral-500 text-lg mb-1">{stock.name}</div>
      <div className="text-neutral-700 text-sm mb-4">({stock.code})</div>
      
      <div className={`text-7xl font-black ${textColor} mb-2`}>
        {isPositive ? '+' : ''}{stock.change?.toFixed(2)}
      </div>
      
      <div className={`text-3xl font-bold ${textColor} flex items-center gap-2`}>
        {isPositive ? '+' : ''}{stock.changePercent?.toFixed(2)}%
        {isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
      </div>
      
      <div className="mt-6 text-neutral-600 font-medium tracking-widest uppercase">
        {isPositive ? '红红火火' : '绿草如茵'}
      </div>
    </div>
  );
}
