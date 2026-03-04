import { api } from '@/lib/api'
import type {
  LLMSettingsResponse,
  LLMSettingsUpdate,
  PromptTemplateResponse,
  PromptUpdate,
} from '@/types/api'

export async function getPrompts(): Promise<PromptTemplateResponse[]> {
  return api.get<PromptTemplateResponse[]>('/settings/prompts')
}

export async function updatePrompt(
  analysisType: string,
  data: PromptUpdate
): Promise<PromptTemplateResponse> {
  return api.put<PromptTemplateResponse>(`/settings/prompts/${analysisType}`, data)
}

export async function resetPrompt(analysisType: string): Promise<PromptTemplateResponse> {
  return api.post<PromptTemplateResponse>(`/settings/prompts/${analysisType}/reset`)
}

export async function getLLMSettings(): Promise<LLMSettingsResponse> {
  return api.get<LLMSettingsResponse>('/settings/llm')
}

export async function updateLLMSettings(data: LLMSettingsUpdate): Promise<LLMSettingsResponse> {
  return api.put<LLMSettingsResponse>('/settings/llm', data)
}
