import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { notifications } from '../api';

type Lang = 'en' | 'ar';

export default function Notifications({ lang }: { lang: Lang }) {
  const isRtl = lang === 'ar';
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['desktop-notifications'], queryFn: async () => (await notifications.list({ page: 1, limit: 50 })).items, refetchInterval: 30_000 });
  const mark = useMutation({ mutationFn: (id: string) => notifications.markRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['desktop-notifications'] }) });
  const markAll = useMutation({ mutationFn: notifications.markAllRead, onSuccess: () => qc.invalidateQueries({ queryKey: ['desktop-notifications'] }) });
  const items = list.data || [];
  return <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}><div className="page-heading"><div><span className="eyebrow">{isRtl ? 'تنبيهات النظام' : 'System alerts'}</span><h1>{isRtl ? 'الإشعارات' : 'Notifications'}</h1><p>{isRtl ? 'التنبيهات المرتبطة بحساب الموظف الحالي.' : 'Alerts for the current employee account.'}</p></div><div className="report-controls"><button className="secondary-action" onClick={() => list.refetch()}><RefreshCw size={16} /></button><button className="primary-action" onClick={() => markAll.mutate()} disabled={markAll.isPending}><Check size={16} /> {isRtl ? 'تحديد الكل كمقروء' : 'Mark all read'}</button></div></div>{list.isLoading && <div className="state-panel">{isRtl ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}</div>}{list.isError && <div className="state-panel">{isRtl ? 'تعذر تحميل الإشعارات.' : 'Could not load notifications.'}</div>}{!list.isLoading && !list.isError && items.length === 0 && <div className="state-panel"><Bell size={28} /> <p>{isRtl ? 'لا توجد إشعارات.' : 'No notifications.'}</p></div>}{items.length > 0 && <div className="notification-list">{items.map(item => { const unread = item.status !== 'read'; return <article className={`notification-row ${unread ? 'unread' : ''}`} key={item.id}><div className="notification-icon"><Bell size={17} /></div><div className="notification-copy"><strong>{isRtl ? item.titleAr || item.title : item.title}</strong><p>{isRtl ? item.messageAr || item.message : item.message}</p><small>{new Date(item.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-GB')}</small></div>{unread && <button className="icon-button" title={isRtl ? 'تحديد كمقروء' : 'Mark as read'} onClick={() => mark.mutate(item.id)}><Check size={16} /></button>}</article>; })}</div>}</section>;
}
