import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('merges class names correctly', () => {
      expect(cn('flex', 'items-center', 'justify-center')).toBe('flex items-center justify-center')
    })

    it('handles conditional classes', () => {
      const showItems = true;
      const hideElement = false;
      expect(cn('flex', showItems && 'items-center', hideElement && 'hidden')).toBe('flex items-center')
    })

    it('handles undefined and null values', () => {
      expect(cn('flex', undefined, null, 'items-center')).toBe('flex items-center')
    })

    it('handles arrays of classes', () => {
      expect(cn(['flex', 'items-center'], 'justify-center')).toBe('flex items-center justify-center')
    })

    it('resolves conflicting Tailwind classes correctly', () => {
      // Should keep the last conflicting class
      expect(cn('p-2', 'p-4')).toBe('p-4')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('handles empty input', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
    })

    it('handles complex conditional logic', () => {
      const isActive = true
      const isDisabled = false
      const size = 'large'
      
      const result = cn(
        'button',
        'rounded',
        isActive && 'active',
        isDisabled && 'disabled',
        size === 'large' && 'text-lg',
        size === 'small' && 'text-sm'
      )
      
      expect(result).toBe('button rounded active text-lg')
    })
  })
})