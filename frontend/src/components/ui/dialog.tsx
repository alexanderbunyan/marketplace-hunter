import * as React from "react"

export const Dialog = ({ children, open, onOpenChange }: any) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => onOpenChange(false)} />
            <div className="z-50 grid w-full gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg md:w-full md:max-w-lg">
                {children}
            </div>
        </div>
    )
}
export const DialogTrigger = ({ children, asChild, onClick }: any) => <div onClick={onClick}>{children}</div>
export const DialogContent = ({ children }: any) => <div>{children}</div>
export const DialogHeader = ({ children }: any) => <div className="flex flex-col space-y-1.5 text-center sm:text-left">{children}</div>
export const DialogTitle = ({ children }: any) => <h2 className="text-lg font-semibold leading-none tracking-tight">{children}</h2>
