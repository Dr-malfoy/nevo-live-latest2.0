import { useEffect, useState } from 'react';
import { coinApi } from '../api';

export const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coinApi.getNotifications({ limit: 30 }).then(({ data }) => {
      if (data.success) setNotifications(data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Notifications</h2>
      {loading ? <p className="text-dark-400">Loading...</p> : notifications.length === 0 ? (
        <p className="text-dark-400">No notifications</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n._id} className={`p-3 bg-dark-800 rounded-xl ${n.read ? 'opacity-60' : ''}`}>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-dark-400">{n.message}</p>
              <p className="text-[10px] text-dark-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
