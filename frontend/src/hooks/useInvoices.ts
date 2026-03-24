import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createInvoice,
  deleteInvoice,
  getRevenueDashboard,
  listInvoices,
  sendInvoice,
} from '@/api/invoices'
import { queryKeys } from '@/lib/queryKeys'
import type { InvoiceCreate } from '@/types/api'

export function useInvoices(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.byClient(clientId ?? ''),
    queryFn: () => listInvoices(clientId!),
    enabled: Boolean(clientId),
  })
}

export function useCreateInvoice(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: InvoiceCreate) => createInvoice(clientId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoices.byClient(clientId) }),
  })
}

export function useDeleteInvoice(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceId: string) => deleteInvoice(invoiceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoices.byClient(clientId) }),
  })
}

export function useSendInvoice(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceId: string) => sendInvoice(invoiceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoices.byClient(clientId) }),
  })
}

export function useRevenueDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.revenue,
    queryFn: getRevenueDashboard,
  })
}
