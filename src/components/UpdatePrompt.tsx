import { RefreshCw } from 'lucide-react'

interface UpdatePromptProps {
  onUpdate: () => void
}

/**
 * 应用更新提示横幅
 * 当检测到新版本时显示，引导用户刷新应用
 */
export function UpdatePrompt({ onUpdate }: UpdatePromptProps) {
  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:w-auto">
      <div className="bg-primary text-white rounded-lg shadow-lg p-4 flex items-center gap-3 animate-slide-up">
        <div className="flex-shrink-0">
          <RefreshCw className="w-5 h-5 animate-spin-slow" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">发现新版本</p>
          <p className="text-xs opacity-90 mt-0.5">点击更新以获取最新功能</p>
        </div>
        <button
          onClick={onUpdate}
          className="flex-shrink-0 bg-white text-primary px-4 py-2 rounded-md font-medium text-sm hover:bg-opacity-90 active:scale-95 transition-all"
        >
          立即更新
        </button>
      </div>
    </div>
  )
}
