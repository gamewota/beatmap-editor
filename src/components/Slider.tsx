import React, { useState } from 'react'

interface SliderProps {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  onChange?: (value: number) => void
  className?: string
}

export default function Slider({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  onChange,
  className = '',
}: SliderProps) {
  const isControlled = typeof controlledValue === 'number'
  const [uncontrolled, setUncontrolled] = useState<number>(defaultValue)
  const current = isControlled ? (controlledValue as number) : uncontrolled

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    if (!isControlled) setUncontrolled(v)
    onChange?.(v)
  }

  return (
    <input
      type="range"
      min={min}
      max={max}
      value={current}
      onChange={handleChange}
      className={className}
    />
  )
}