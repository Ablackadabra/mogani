import { X, LogOut, MapPin, Navigation } from 'lucide-react';
import { Language, Order, PublicUser } from '../types';
import { formatRwf } from '../utils/image';

interface OrdersDrawerProps {
  lang: Language;
  user: PublicUser;
  orders: Order[];
  onClose: () => void;
  onLogout: () => void;
  onTrackOnMap: (order: Order) => void;
}

export function OrdersDrawer({
  lang,
  user,
  orders,
  onClose,
  onLogout,
  onTrackOnMap,
}: OrdersDrawerProps) {
  const myOrders = orders.filter((o) => o.buyerId === user.id || o.sellerId === user.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Orders and account"
    >
      <div className="w-full max-w-md bg-[#FAF9F6] h-full border-l border-[#E7E5E4] flex flex-col justify-between shadow-2xl">
        <div className="px-6 py-4 bg-white border-b border-[#E7E5E4] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-[#D6D3D1] shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1C1917] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1C1917] truncate">{user.name}</p>
              <p className="text-xs text-[#57534E] truncate">
                {user.email} · {user.phone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-[#57534E] hover:text-[#1C1917] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-xs font-semibold text-[#78716C]">
            {lang === 'rw' ? 'Command, Gukodesha & Gusana' : 'My Orders, Rentals & Repairs'} ({myOrders.length})
          </h3>

          {myOrders.length === 0 ? (
            <div className="p-6 bg-white border border-[#E7E5E4] rounded-lg text-sm text-[#57534E]">
              {lang === 'rw'
                ? 'Nta command cyangwa ubusabe bwo gusana uratanga.'
                : 'You have not placed any furniture orders or repair requests yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-white border border-[#E7E5E4] rounded-lg space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[#7C4D25]">{order.id}</span>
                    <span className="font-medium text-[#1C1917] capitalize">
                      {order.orderType} · {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={order.uploadedPhotoUrl || order.referenceImageUrl}
                      alt={order.productTitle}
                      className="w-14 h-11 rounded object-cover shrink-0 bg-[#F2EFE9]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1C1917] truncate">
                        {order.productTitle}
                      </p>
                      <p className="text-xs text-[#57534E] truncate">{order.workshopName}</p>
                    </div>
                  </div>

                  {order.driverLocationLabel && (
                    <div className="px-3 py-2 rounded bg-[#FFFBEB] border border-[#FDE68A] text-xs flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[#B45309] font-medium truncate">
                        <Navigation className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{order.driverLocationLabel}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onTrackOnMap(order)}
                        className="text-[11px] font-semibold text-[#7C4D25] hover:underline shrink-0 cursor-pointer"
                      >
                        {lang === 'rw' ? 'Reba ku ikarita' : 'Track Map'}
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#F2EFE9] flex items-center justify-between text-xs gap-2">
                    <span className="text-[#57534E] inline-flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#7C4D25] shrink-0" />
                      <span className="truncate">{order.deliveryAddress}</span>
                    </span>
                    <span className="font-mono font-semibold text-[#1C1917] tabular-nums shrink-0">
                      {formatRwf(order.agreedPriceRwf)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 bg-white border-t border-[#E7E5E4]">
          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'rw' ? 'Sohoka muri Konti (Sign Out)' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
