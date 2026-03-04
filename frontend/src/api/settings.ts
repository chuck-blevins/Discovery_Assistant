import { api } from '@/lib/api'
import type {
  LLMSettingsResponse,
  LLMSettingsUpdate,
  PromptTemplateResponse,
  PromptUpdate,
} from '@/types/api'

export async function getPrompts(): Promise<PromptTemplateResponse[]> {
  const res = await api.get('/settings/prompts')
  return res.data
}

export async function updatePrompt(
  analysisType: string,
  data: PromptUpdate
): Promise<PromptTemplateResponse> {
  const res = await api.put(`/settings/prompts/${analysisType}`, data)
  return res.data
}

export async function resetPrompt(analysisType: string): Promise<PromptTemplateResponse> {
  const res = await api.post(`/settings/prompts/${analysisType}/reset`)
  return res.data
}

export async function getLLMSettings(): Promise<LLMSettingsResponse> {
  const res = await api.get('/settings/llm')
  return res.data
}

export async function updateLLMSettings(data: LLMSettingsUpdate): Promise<LLMSettingsResponse> {
  const res = await api.put('/settings/llm', data)
  return res.data
}
