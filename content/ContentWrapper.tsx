import { ContentApp } from './ContentApp'
import scripts from '../data/scripts.json'
import { useHandySetup } from '@/store/useHandyStore'

export const ContentWrapper = () => {
  const url = window.location.href
  const videoUrl = Object.keys(scripts).find((key) => url.includes(key))
  const script = videoUrl ? scripts[videoUrl as keyof typeof scripts] : null

  // Only activate connection if we have a script for this site
  useHandySetup('contentScript', !!script)

  return script ? <ContentApp script={script} /> : null
}
