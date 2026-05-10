// Animated aurora background — large blurred color blobs slowly drifting
// across the viewport. Inspired by the Apple Music "Now Playing" backdrop.
// Static, decorative, no JS — pure CSS animations behind the content.

export default function Aurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
    </div>
  );
}
