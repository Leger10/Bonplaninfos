import { useState } from 'react'
import { toast } from "@/components/ui/use-toast"

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState(null)

  const copy = async (text) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported')
      toast({
        title: "Erreur",
        description: "Le presse-papier n'est pas supporté par votre navigateur",
        variant: "destructive"
      })
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      toast({
        title: "Succès",
        description: "Copié dans le presse-papier !",
        className: "bg-green-600 text-white border-none"
      })
      return true
    } catch (error) {
      console.warn('Copy failed', error)
      setCopiedText(null)
      toast({
        title: "Erreur",
        description: "Impossible de copier le texte",
        variant: "destructive"
      })
      return false
    }
  }

  return [copiedText, copy]
}