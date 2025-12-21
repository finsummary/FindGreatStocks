import * as React from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { Smartphone, Monitor, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MobileWarning() {
  const isMobile = useIsMobile()
  const [isPortrait, setIsPortrait] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    // Проверяем темную тему
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    
    // Слушаем изменения темы
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const checkOrientation = () => {
      // Проверяем, является ли устройство мобильным и находится ли в портретной ориентации
      const portrait = window.innerHeight > window.innerWidth
      setIsPortrait(portrait)
      
      // Показываем предупреждение только на мобильных устройствах в портретной ориентации
      if (isMobile && portrait) {
        setOpen(true)
      } else {
        setOpen(false)
      }
    }

    // Проверяем при монтировании
    checkOrientation()

    // Слушаем изменения размера окна (включая поворот устройства)
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [isMobile])

  // Не показываем предупреждение, если устройство не мобильное
  if (!isMobile) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent 
        className="max-w-md mx-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 !z-[100]"
        style={{ 
          backgroundColor: isDark ? '#18181b' : 'white',
          zIndex: 100
        } as React.CSSProperties}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-8 w-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <AlertDialogTitle className="text-xl text-zinc-900 dark:text-zinc-100">
              Best viewed on PC/Laptop
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3 pt-2 text-zinc-700 dark:text-zinc-300">
            <p>
              This site is optimized for use on a computer or laptop. 
              For the best experience with tables and data, we recommend using a desktop device.
            </p>
            <div className="flex items-start gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <Monitor className="h-5 w-5 text-zinc-600 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <strong className="text-zinc-900 dark:text-zinc-100">Tip:</strong> If you're using a mobile device, 
                please rotate it horizontally (landscape orientation) for a better viewing experience.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  )
}

