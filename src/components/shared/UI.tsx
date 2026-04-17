//UI
import React, { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const B = '#bc5d5d';
const D = '#3b3130';

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 font-display';
  const variants = {
    primary: `text-white focus:ring-[#bc5d5d]`,
    secondary: `focus:ring-[#bc5d5d]`,
    ghost: 'bg-transparent text-[#3b3130] hover:bg-[#f0e8e7]',
    danger: `text-white focus:ring-red-600`,
    outline: `border-2 border-[#bc5d5d] text-[#bc5d5d] hover:bg-[#bc5d5d] hover:text-white focus:ring-[#bc5d5d]`,
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2.5 text-sm gap-2', lg: 'px-6 py-3 text-base gap-2' };
  const inlineStyles = {
    primary: { background: '#bc5d5d', color: '#fff' },
    secondary: { background: '#f7f0ef', color: '#3b3130', border: '1px solid #e5d8d7' },
    ghost: {},
    danger: { background: '#c0392b' },
    outline: {},
  };
  return (
    <button {...props} disabled={disabled || loading} style={inlineStyles[variant]}
      className={cn(base, variants[variant], sizes[size], className)}>
      {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
      {children}
    </button>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', className)}>{children}</span>;
}

export function Card({ children, className, hover, onClick }: { children: ReactNode; className?: string; hover?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ background: '#fff', borderColor: '#e8dedd' }}
      className={cn('rounded-2xl border shadow-sm', hover && 'hover:shadow-md hover:border-[#bc5d5d]/30 transition-all duration-200 cursor-pointer', className)}>
      {children}
    </div>
  );
}

export function Input({ label, error, icon, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; icon?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-semibold" style={{ color: D, fontFamily: 'Syne, sans-serif' }}>{label}</label>}
      <div className="relative">
        {icon && <div className="absolute inset-y-0 left-3 flex items-center" style={{ color: '#bc5d5d', opacity: 0.7 }}>{icon}</div>}
        <input {...props} style={{ background: '#f7f0ef', borderColor: error ? '#bc5d5d' : '#e0d5d4', color: D }}
          className={cn('w-full rounded-xl border px-3 py-2.5 text-sm placeholder-[#b09e9d] focus:outline-none focus:ring-2 focus:ring-[#bc5d5d] focus:border-transparent transition-all duration-200', icon && 'pl-10', className)} />
      </div>
      {error && <p className="text-xs" style={{ color: '#bc5d5d' }}>{error}</p>}
    </div>
  );
}

export function Select({ label, value, onChange, options, className }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-semibold" style={{ color: D, fontFamily: 'Syne, sans-serif' }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: '#f7f0ef', borderColor: '#e0d5d4', color: D }}
        className={cn('w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#bc5d5d] focus:border-transparent transition-all', className)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Textarea({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-semibold" style={{ color: D, fontFamily: 'Syne, sans-serif' }}>{label}</label>}
      <textarea {...props} style={{ background: '#f7f0ef', borderColor: '#e0d5d4', color: D }}
        className={cn('w-full rounded-xl border px-3 py-2.5 text-sm placeholder-[#b09e9d] focus:outline-none focus:ring-2 focus:ring-[#bc5d5d] focus:border-transparent transition-all resize-none', className)} />
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: D, fontFamily: 'Syne, sans-serif' }}>{title}</h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: '#8a7170' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 opacity-30">{icon}</div>
      <h3 className="text-lg font-bold mb-1" style={{ color: D, fontFamily: 'Syne, sans-serif' }}>{title}</h3>
      {description && <p className="text-sm mb-4" style={{ color: '#8a7170' }}>{description}</p>}
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <svg className={cn('animate-spin h-5 w-5', className)} style={{ color: '#bc5d5d' }} viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('border-t', className)} style={{ borderColor: '#e8dedd' }} />;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#3b3130]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: '#fff' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #e8dedd' }}>
          <h3 className="text-lg font-bold" style={{ color: D, fontFamily: 'Syne, sans-serif' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-[#f7f0ef]" style={{ color: '#8a7170' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
