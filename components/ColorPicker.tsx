import React from 'react'

const ALL_COLORS = [
  { hex: '#e74c3c', name: 'Crimson' },
  { hex: '#e67e22', name: 'Orange' },
  { hex: '#f1c40f', name: 'Gold' },
  { hex: '#2ecc71', name: 'Emerald' },
  { hex: '#1abc9c', name: 'Teal' },
  { hex: '#3498db', name: 'Blue' },
  { hex: '#9b59b6', name: 'Purple' },
  { hex: '#e91e63', name: 'Pink' },
  { hex: '#00bcd4', name: 'Cyan' },
  { hex: '#ff5722', name: 'Deep Orange' },
  { hex: '#8bc34a', name: 'Lime' },
  { hex: '#607d8b', name: 'Steel' },
]

interface ColorPickerProps {
  selectedColor: string
  takenColors: string[]
  onChange: (color: string) => void
}

export default function ColorPicker({ selectedColor, takenColors, onChange }: ColorPickerProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 spooky-title tracking-widest mb-3">CHOOSE YOUR COLOR</p>
      <div className="grid grid-cols-6 gap-2">
        {ALL_COLORS.map(({ hex, name }) => {
          const taken = takenColors.includes(hex)
          const selected = selectedColor === hex
          return (
            <button
              key={hex}
              onClick={() => !taken && onChange(hex)}
              disabled={taken}
              title={taken ? `${name} (taken)` : name}
              className="relative w-10 h-10 rounded-full transition-all duration-200 disabled:cursor-not-allowed"
              style={{
                backgroundColor: hex,
                opacity: taken ? 0.25 : 1,
                transform: selected ? 'scale(1.25)' : 'scale(1)',
                boxShadow: selected ? `0 0 12px ${hex}, 0 0 24px ${hex}88` : 'none',
                border: selected ? `2px solid white` : '2px solid transparent',
              }}
            >
              {selected && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">✓</span>
              )}
              {taken && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✕</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}