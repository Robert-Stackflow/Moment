import { Button } from '@robert-stackflow/oneui/Button'
import { Placeholder } from '@robert-stackflow/oneui/Placeholder'
import { LoadingState } from '@robert-stackflow/oneui/LoadingState'
import '../../styles/gallery/controls.css'

export default function GalleryStatus({ loading = false }) {
  return (
    <main className="gallery-page-status" role={loading ? 'status' : 'alert'}>
      {loading ? (
        <LoadingState label="加载相册" showLabel={false} />
      ) : (
        <div className="gallery-page-status-content">
          <Placeholder variant="error" title="相册暂时无法加载" />
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      )}
    </main>
  )
}
