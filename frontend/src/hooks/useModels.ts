import { useCallback, useEffect, useState } from "react"
import { api } from "../services/api"
import type { ModelConfig } from "../types"

export function useModels() {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [selectedModelId, setSelectedModelId] = useState("")
  const [loading, setLoading] = useState(true)

  const loadModels = useCallback(async () => {
    try {
      const data = await api.listModels()
      setModels(data)
      if (data.length > 0 && !selectedModelId) {
        setSelectedModelId(data[0]!.id)
      }
    } catch (e) {
      console.error("Failed to load models:", e)
    } finally {
      setLoading(false)
    }
  }, [selectedModelId])

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  const addModel = async (model: ModelConfig) => {
    await api.addModel(model)
    await loadModels()
  }

  const updateModel = async (id: string, data: Partial<ModelConfig>) => {
    await api.updateModel(id, data)
    await loadModels()
  }

  const deleteModel = async (id: string) => {
    await api.deleteModel(id)
    setModels((prev) => prev.filter((m) => m.id !== id))
    if (selectedModelId === id && models.length > 1) {
      const remaining = models.filter((m) => m.id !== id)
      setSelectedModelId(remaining[0]?.id ?? "")
    }
  }

  return {
    models,
    selectedModelId,
    setSelectedModelId,
    loading,
    addModel,
    updateModel,
    deleteModel,
  }
}
