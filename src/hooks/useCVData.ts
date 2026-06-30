import { useState, useCallback } from 'react'

type CVData = Record<string, unknown>

export const useCVData = (initialData: CVData = {}) => {
  const [cvData, setCVData] = useState<CVData>(initialData)

  const updateField = useCallback((path: string, value: unknown) => {
    setCVData(prev => {
      const newData: CVData = JSON.parse(JSON.stringify(prev))
      const keys = path.match(/[^.\[\]]+/g) ?? []
      let current: CVData = newData

      for (let i = 0; i < keys.length - 1; i++) {
        const key = isNaN(Number(keys[i])) ? keys[i] : parseInt(keys[i])
        if (current[key] === undefined || current[key] === null) {
          const nextKey = keys[i + 1]
          current[key] = isNaN(Number(nextKey)) ? {} : []
        }
        current = current[key] as CVData
      }

      const lastKey = isNaN(Number(keys[keys.length - 1]))
        ? keys[keys.length - 1]
        : parseInt(keys[keys.length - 1])
      current[lastKey] = value

      return newData
    })
  }, [])

  const loadData = useCallback((data: CVData) => {
    setCVData(data)
  }, [])

  return {
    cvData,
    updateField,
    loadData
  }
}
