import { useCallback, useRef } from 'react'

export function useSound() {
  const audioContextRef = useRef(null)

  const playTone = useCallback((frequency, duration, type = 'sine') => {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }, [])

  const playScratch = useCallback(() => {
    const noise = () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return

      const ctx = new AudioContext()
      const bufferSize = ctx.sampleRate * 0.1
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3
      }

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start()
    }
    noise()
  }, [])

  const playSuccess = useCallback(() => {
    playTone(523.25, 0.1)
    setTimeout(() => playTone(659.25, 0.1), 100)
    setTimeout(() => playTone(783.99, 0.2), 200)
  }, [playTone])

  const playFail = useCallback(() => {
    playTone(392, 0.15, 'triangle')
    setTimeout(() => playTone(349.23, 0.3, 'triangle'), 150)
  }, [playTone])

  return { playScratch, playSuccess, playFail }
}