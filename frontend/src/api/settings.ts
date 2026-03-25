import { api } from '@/lib/api'
import type {
  LLMSettingsResponse,
  LLMSettingsUpdate,
  PromptTemplateResponse,
  PromptUpdate,
  StripeSettingsResponse,
  StripeSettingsUpdate,
} from '@/types/api'

export interface AnalysisTypeInfo {
  value: string
  label: string
  description: string
}

export async function getAnalysisTypes(): Promise<AnalysisTypeInfo[]> {
  return api.get<AnalysisTypeInfo[]>('/settings/analysis-types')
}

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

export async function getStripeSettings(): Promise<StripeSettingsResponse> {
  return api.get<StripeSettingsResponse>('/settings/stripe')
}

export async function updateStripeSettings(data: StripeSettingsUpdate): Promise<StripeSettingsResponse> {
  return api.put<StripeSettingsResponse>('/settings/stripe', data)
}

export interface StripePrice {
  id: string
  unit_amount: number | null
  currency: string
  nickname: string | null
}

export interface StripeProduct {
  id: string
  name: string
  prices: StripePrice[]
}

export async function getStripeCatalog(): Promise<StripeProduct[]> {
  return api.get<StripeProduct[]>('/settings/stripe/catalog')
}