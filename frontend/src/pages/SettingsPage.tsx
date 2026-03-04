import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getLLMSettings } from '@/api/settings'
import { SettingsLayout } from '@/components/app/settings/SettingsLayout'

export default function SettingsPage() {
  const [searchParams] = useSearchParams()
  const isSetup = searchParams.get('setup') === 'true'
  const navigate = useNavigate()

  const { data: llmSettings } = useQuery({
    queryKey: ['settings', 'llm'],
    queryFn: getLLMSettings,
  })

  // Once API key is saved in setup mode, redirect to dashboard
  useEffect(() => {
    if (isSetup && llmSettings?.api_key_is_set) {
      navigate('/', { replace: true })
    }
  }, [isSetup, llmSettings?.api_key_is_set, navigate])

  return <SettingsLayout isSetup={isSetup} />
}
