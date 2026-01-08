import { useEffect, useState } from 'react'

interface ServiceWorkerUpdateResult {
  isUpdateAvailable: boolean
  updateApp: () => void
}

/**
 * 检测 Service Worker 更新并提供刷新应用的方法
 */
export function useServiceWorkerUpdate(): ServiceWorkerUpdateResult {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    // 确保在浏览器环境中运行
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // 监听 Service Worker 的更新
    const controller = navigator.serviceWorker.controller

    if (!controller) {
      // 首次加载，没有活跃的 Service Worker
      return
    }

    // 监听控制器变化（新 Service Worker 已经安装并等待激活）
    const handleControllerChange = () => {
      console.log('Service Worker controller changed')
      // 当控制器改变时，说明新版本已经激活，刷新页面
      window.location.reload()
    }

    // 监听来自 Service Worker 的消息
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'SKIP_WAITING') {
        // Service Worker 通知可以跳过等待
        setWaitingWorker(event.source as ServiceWorker)
        setIsUpdateAvailable(true)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
    }
  }, [])

  const updateApp = () => {
    if (waitingWorker) {
      // 发送消息给等待中的 Service Worker，让它跳过等待并激活
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  return { isUpdateAvailable, updateApp }
}
