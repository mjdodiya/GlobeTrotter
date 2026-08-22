import { Toast } from "radix-ui"
import { createContext, type ReactNode, useContext, useMemo, useState } from "react"

type ToastMessage = {
  description?: string
  title: string
  variant?: "default" | "destructive"
}

type ToastInterface = {
  show(message: ToastMessage): void
}

const ToastContext = createContext<ToastInterface | undefined>(undefined)

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const [open, setOpen] = useState(false)
  const value = useMemo<ToastInterface>(
    () => ({
      show(nextMessage) {
        setMessage(nextMessage)
        setOpen(true)
      },
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider duration={5_000} swipeDirection="right">
        {children}
        {message ? (
          <Toast.Root
            role={message.variant === "destructive" ? "alert" : "status"}
            open={open}
            onOpenChange={setOpen}
            className="grid gap-1 rounded-xl border bg-background p-4 shadow-lg data-[state=closed]:motion-safe:animate-out data-[state=open]:motion-safe:animate-in"
          >
            <Toast.Title className="font-medium">{message.title}</Toast.Title>
            {message.description ? (
              <Toast.Description className="text-sm text-muted-foreground">
                {message.description}
              </Toast.Description>
            ) : null}
          </Toast.Root>
        ) : null}
        <Toast.Viewport className="fixed right-0 bottom-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}

export function useAppToast(): ToastInterface {
  const value = useContext(ToastContext)
  if (!value) throw new Error("useAppToast must be used within AppToastProvider")
  return value
}
