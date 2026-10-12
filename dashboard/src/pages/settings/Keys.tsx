import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { del, post, type CreatedKey } from '../../lib/api'
import { useKeys } from '../../lib/queries'
import { ago } from '../../lib/format'
import { Button, Empty, ErrorNote, Field, Input, Panel, Skeleton, useArm, useToast } from '../../components/ui'

export default function Keys() {
  const { data, isLoading, error } = useKeys()
  const qc = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<CreatedKey | null>(null)
  const { armed, arm, reset } = useArm()

  const create = useMutation({
    mutationFn: () => post<CreatedKey>('/api/keys', { name: name.trim() || 'Default API Key' }),
    onSuccess: (k) => {
      setFresh(k)
      setName('')
      qc.invalidateQueries({ queryKey: ['keys'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => del(`/api/keys/${encodeURIComponent(id)}`),
    onSuccess: () => {
      toast('Key revoked. Agents using it are now refused.')
      qc.invalidateQueries({ queryKey: ['keys'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const keys = data?.keys || []
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-dim">An API key lets an agent send events to Cerbere. Create one per agent or environment so you can revoke them separately.</p>
      {error && <ErrorNote message={(error as Error).message} />}

      {fresh && (
        <div role="status" className="rounded-lg border border-amber/50 bg-amber/10 p-4">
          <p className="font-display text-[15px]">Copy your key now: it is shown only once.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded border border-line bg-ink px-3 py-2 font-mono text-[12.5px]">{fresh.key}</code>
            <Button
              onClick={() => {
                navigator.clipboard?.writeText(fresh.key)
                toast('Key copied')
              }}
            >
              <Copy size={13} /> Copy
            </Button>
            <Button variant="ghost" onClick={() => setFresh(null)}>
              Done
            </Button>
          </div>
        </div>
      )}

      <Panel title="Create a key">
        <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
          <div className="min-w-[220px] flex-1">
            <Field label="Name" hint="For example production-support-bot">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Default API Key" />
            </Field>
          </div>
          <Button variant="primary" disabled={create.isPending} onClick={() => create.mutate()}>
            Create key
          </Button>
        </div>
      </Panel>

      <Panel title="Your keys">
        {isLoading ? (
          <Skeleton className="m-4 h-20" />
        ) : keys.length === 0 ? (
          <Empty title="No key yet" text="Create your first key above, then paste it into one of the integrations." />
        ) : (
          <ul>
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3 text-[13px] last:border-0">
                <div className="min-w-0">
                  <div className="text-paper">{k.name}</div>
                  <div className="font-mono text-[12px] text-faint">{k.key_preview}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-faint">{k.created_at ? ago(k.created_at) : ''}</span>
                  <span style={{ color: k.active ? 'var(--color-allow)' : 'var(--color-faint)' }}>{k.active ? 'Active' : 'Revoked'}</span>
                  {k.active && (
                    <Button
                      variant="danger"
                      disabled={revoke.isPending}
                      aria-label={`Revoke ${k.name}`}
                      onClick={() => {
                        if (armed === k.id) {
                          reset()
                          revoke.mutate(k.id)
                        } else arm(k.id)
                      }}
                    >
                      {armed === k.id ? 'Click again to confirm' : 'Revoke'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
