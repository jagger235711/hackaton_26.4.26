import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import StockCardContent from './StockCardContent';

export default function CanvasScratchCard({ onReveal, revealed, stock }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 初始绘制覆盖层
    ctx.globalCompositeOperation = 'source-over';
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#374151'); // gray-700
    gradient.addColorStop(1, '#111827'); // gray-900
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制提示文字
    ctx.fillStyle = '#9ca3af'; // gray-400
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('手动刮开看收益', width / 2, height / 2);
    ctx.font = '14px sans-serif';
    ctx.fillText('刮开面积 > 40% 揭示', width / 2, height / 2 + 40);

  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // 计算缩放比例
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const scratch = (e) => {
    if (!isDrawing || revealed) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
    ctx.fill();

    checkPercent();
  };

  const checkPercent = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) {
        transparentPixels++;
      }
    }

    const percent = (transparentPixels / (canvas.width * canvas.height)) * 100;
    if (percent > 40) {
      onReveal();
    }
  };

  if (!stock) return null;

  const isPositive = stock.change >= 0;
  const textColor = isPositive ? 'text-red-500' : 'text-green-500';

  return (
    <div className="relative w-full h-[400px] bg-black rounded-2xl overflow-hidden border-2 border-neutral-800 shadow-2xl">
      {/* 底层内容：实时预览 */}
      <StockCardContent stock={stock} />

      {/* 顶层 Canvas 覆盖层 */}
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        style={{ display: revealed ? 'none' : 'block' }}
        className="absolute inset-0 z-10 w-full h-full cursor-crosshair touch-none"
        onMouseDown={() => setIsDrawing(true)}
        onMouseUp={() => setIsDrawing(false)}
        onMouseLeave={() => setIsDrawing(false)}
        onMouseMove={scratch}
        onTouchStart={() => setIsDrawing(true)}
        onTouchEnd={() => setIsDrawing(false)}
        onTouchMove={scratch}
      />
    </div>
  );
}
