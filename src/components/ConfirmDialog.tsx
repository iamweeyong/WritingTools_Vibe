import { useUIStore } from '@/stores/useUIStore';

export function ConfirmDialog() {
  const { confirm, hideConfirm } = useUIStore();
  if (!confirm.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={hideConfirm}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <p>{confirm.message}</p>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={hideConfirm}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              confirm.onConfirm?.();
              hideConfirm();
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
