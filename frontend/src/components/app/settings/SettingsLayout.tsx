import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PromptsTab } from './PromptsTab'
import { LLMConfigTab } from './LLMConfigTab'
import { ThemeTab } from './ThemeTab'
import { StripeConfigTab } from './StripeConfigTab'

export function SettingsLayout({ isSetup = false }: { isSetup?: boolean }) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">Settings</h1>
      <Tabs defaultValue={isSetup ? 'llm' : 'prompts'}>
        <TabsList>
          <TabsTrigger value="prompts">AI Prompts</TabsTrigger>
          <TabsTrigger value="llm">LLM Configuration</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
          <TabsTrigger value="theme">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="prompts" className="mt-6">
          <PromptsTab />
        </TabsContent>
        <TabsContent value="llm" className="mt-6">
          <LLMConfigTab isSetup={isSetup} />
        </TabsContent>
        <TabsContent value="stripe" className="mt-6">
          <StripeConfigTab />
        </TabsContent>
        <TabsContent value="theme" className="mt-6">
          <ThemeTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}