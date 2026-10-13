import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, ExternalLink, Mail } from 'lucide-react'
import { useMe } from '../lib/queries'
import { LEGAL_URL, MCP_README_URL, PRIVACY_URL, README_URL, SUPPORT_EMAIL, TERMS_URL } from '../lib/links'
import { Modal } from './Modal'
import { Button, Field, Select, useToast } from './ui'

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-amber hover:underline">
      {children}
      <ExternalLink size={12} aria-hidden />
    </a>
  )
}

export function DocsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const step = (n: number, to: string, label: string, text: string) => (
    <li className="flex gap-3">
      <span className="num mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-lift text-[12px] text-paper">{n}</span>
      <div>
        <Link to={to} onClick={onClose} className="text-paper underline decoration-dotted underline-offset-2 hover:text-amber">
          {label}
        </Link>
        <p className="text-dim">{text}</p>
      </div>
    </li>
  )
  return (
    <Modal open={open} onClose={onClose} title="Documentation">
      <div className="space-y-5 text-[13.5px]">
        <section>
          <h3 className="mb-2 font-display text-[15px]">Start in three steps</h3>
          <ol className="space-y-3">
            {step(1, '/settings?tab=keys', 'Create an API key', 'One key per agent or environment, so you can revoke them separately.')}
            {step(2, '/settings?tab=connect', 'Add the SDK to your agent', 'pip install cerbere-ag, then wrap your tools and model calls with the snippet for your stack.')}
            {step(3, '/feed', 'Watch the first event arrive', 'Run your agent once. Each action it attempts appears with the decision Cerbere made.')}
          </ol>
        </section>
        <section>
          <h3 className="mb-2 font-display text-[15px]">Reading the dashboard</h3>
          <ul className="space-y-1.5 text-dim">
            <li>
              <span className="text-allow">Allowed</span>, <span className="text-amber">Flagged</span> and <span className="text-block">Blocked</span> are the three
              decisions. Click any event to open its trace.
            </li>
            <li>Data is classified from PUBLIC up to SECRET. Sensitive data reaching an external tool is blocked.</li>
            <li>Actions that need a human land in Approvals. Agents can be disconnected in one click from Agents.</li>
            <li>Budgets, policies and alerts are in Settings.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-2 font-display text-[15px]">Full reference</h3>
          <ul className="space-y-1.5">
            <li>
              <Ext href={README_URL}>README: SDK, taint tracking, detection numbers</Ext>
            </li>
            <li>
              <Ext href={MCP_README_URL}>MCP server setup</Ext>
            </li>
          </ul>
        </section>
      </div>
    </Modal>
  )
}

const KINDS = [
  { value: 'question', label: 'A question' },
  { value: 'bug', label: 'Something is broken' },
  { value: 'security', label: 'A security issue' },
]

export function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: me } = useMe()
  const toast = useToast()
  const [kind, setKind] = useState('question')
  const [message, setMessage] = useState('')

  const subject = kind === 'security' ? '[Security] Cerbere' : kind === 'bug' ? '[Bug] Cerbere' : '[Question] Cerbere'
  const diagnostics = [
    '--- Diagnostics (please keep) ---',
    `Account: ${me?.user?.email ?? 'unknown'}${me?.user?.org_id ? ` (org ${me.user.org_id})` : ''}`,
    `Page: ${window.location.href}`,
    `Browser: ${navigator.userAgent}`,
    `Time: ${new Date().toISOString()}`,
  ].join('\n')
  const body = `${message.trim() || 'Tell us what happened and what you expected.'}\n\n${diagnostics}`
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <Modal open={open} onClose={onClose} title="Contact support">
      <div className="space-y-4 text-[13.5px]">
        <p className="text-dim">
          Write to us and we will answer by email. The message includes basic details about your account and browser so we do not have to ask for them.
        </p>
        <Field label="What is it about?">
          <Select value={kind} onChange={(e) => setKind(e.target.value)} options={KINDS} />
        </Field>
        {kind === 'security' && (
          <p role="note" className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-[13px]">
            Please do not post security issues publicly. Describe the problem and how to reproduce it in this email.
          </p>
        )}
        <Field label="Your message">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="What happened, what you expected, and the trace id if you have one"
            className="w-full rounded-md border border-line bg-ink px-3 py-2 text-[13px] text-paper placeholder:text-faint"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={mailto}
            className="inline-flex items-center gap-2 rounded-md bg-amber px-3 py-1.5 text-[13px] font-medium text-ink hover:brightness-110"
          >
            <Mail size={14} /> Send by email
          </a>
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(`To: ${SUPPORT_EMAIL}\nSubject: ${subject}\n\n${body}`)
              toast('Message copied')
            }}
          >
            <Copy size={13} /> Copy message
          </Button>
        </div>
        <p className="text-[12.5px] text-faint">
          If your email app does not open, copy the message and send it to <span className="text-dim">{SUPPORT_EMAIL}</span>.
        </p>
        <p className="border-t border-line pt-3 text-[12.5px] text-dim">
          <Ext href={LEGAL_URL}>Legal documents</Ext>
          <span className="mx-2 text-faint">·</span>
          <Ext href={TERMS_URL}>Terms</Ext>
          <span className="mx-2 text-faint">·</span>
          <Ext href={PRIVACY_URL}>Privacy</Ext>
        </p>
      </div>
    </Modal>
  )
}
