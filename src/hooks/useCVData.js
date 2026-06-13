import { useState, useCallback } from 'react'

export const useCVData = (initialData = {}) => {
  const [cvData, setCVData] = useState(initialData)

  const updateField = useCallback((path, value) => {
    setCVData(prev => {
      const newData = JSON.parse(JSON.stringify(prev))
      const keys = path.match(/[^.\[\]]+/g)
      let current = newData

      for (let i = 0; i < keys.length - 1; i++) {
        const key = isNaN(keys[i]) ? keys[i] : parseInt(keys[i])
        if (current[key] === undefined || current[key] === null) {
          const nextKey = keys[i + 1]
          current[key] = isNaN(nextKey) ? {} : []
        }
        current = current[key]
      }

      const lastKey = isNaN(keys[keys.length - 1])
        ? keys[keys.length - 1]
        : parseInt(keys[keys.length - 1])
      current[lastKey] = value

      return newData
    })
  }, [])

  const loadData = useCallback((data) => {
    setCVData(data)
  }, [])

  return {
    cvData,
    updateField,
    loadData
  }
}
