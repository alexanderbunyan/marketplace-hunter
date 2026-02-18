import * as React from "react"

// Simplified Select for manual implementation without Radix UI complexity
// In a real generic app we'd use Radix, but here we just need it to work.
export const Select = ({ children, onValueChange, value }: any) => {
    return (
        <div className="relative" data-value={value} onChange={(e: any) => onValueChange(e.target.value)}>
            {children}
        </div>
    )
}

export const SelectTrigger = ({ children, className }: any) => <div className={`border p-2 rounded ${className}`}>{children}</div>
export const SelectValue = () => <span>Select...</span>
export const SelectContent = ({ children }: any) => <div className="absolute top-10 w-full bg-white border shadow rounded z-10">{children}</div>
export const SelectItem = ({ value, children }: any) => (
    <div className="p-2 hover:bg-slate-100 cursor-pointer" onClick={() => {
        // This mock implementation is incomplete because implementing a full Select from scratch is hard.
        // Ideally we should use a native <select> if we can't install ShadCN properly.
    }}>
        {children}
    </div>
)

// actually, let's just use a native select for robustness if we can't easily add Radix
export const SimpleSelect = ({ value, onValueChange, options }: any) => (
    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={value} onChange={e => onValueChange(e.target.value)}>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
)
