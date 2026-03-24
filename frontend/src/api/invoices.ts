import { api } from '@/lib/api'
import type { InvoiceCreate, InvoiceResponse, RevenueDashboard } from '@/types/api'

export async function listInvoices(clientId: string): Promise<InvoiceResponse[]> {
  return api.get<InvoiceResponse[]>(`/clients/${clientId}/invoices`)
}

export async function createInvoice(clientId: string, data: InvoiceCreate): Promise<InvoiceResponse> {
  return api.post<InvoiceResponse>(`/clients/${clientId}/invoices`, data)
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  return api.delete<void>(`/invoices/${invoiceId}`)
}

export async function sendInvoice(invoiceId: string): Promise<InvoiceResponse> {
  return api.post<InvoiceResponse>(`/invoices/${invoiceId}/send`)
}

export async function getRevenueDashboard(): Promise<RevenueDashboard> {
  return api.get<RevenueDashboard>('/dashboard/revenue')
}
