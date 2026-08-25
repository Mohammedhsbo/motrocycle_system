import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, UserPlus } from 'lucide-react';
import { branches, roles, users } from '../api';

export default function AccountManagement({ lang }: { lang: 'en' | 'ar' }) {
  const isRtl = lang === 'ar';
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', whatsappSenderNumber: '', roleId: '', branchId: '' });
  const [error, setError] = useState('');
  const userQuery = useQuery({ queryKey: ['account-users'], queryFn: users.list });
  const branchQuery = useQuery({ queryKey: ['active-branches'], queryFn: branches.list });
  const roleQuery = useQuery({ queryKey: ['assignable-roles'], queryFn: roles.list });
  const selectedRole = roleQuery.data?.find((role) => role.id === form.roleId);
  const createUser = useMutation({
    mutationFn: () => users.create({
      name: form.name,
      email: form.email,
      password: form.password,
      whatsappSenderNumber: form.whatsappSenderNumber || undefined,
      roleId: form.roleId,
      ...(selectedRole?.name === 'super_admin' ? {} : { branchId: form.branchId }),
    }),
    onSuccess: () => {
      setForm({ name: '', email: '', password: '', whatsappSenderNumber: '', roleId: '', branchId: '' });
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['account-users'] });
    },
    onError: (reason: Error & { code?: string }) => setError(reason.message || reason.code || 'Request failed'),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.roleId || (selectedRole?.name !== 'super_admin' && !form.branchId)) {
      setError(isRtl ? 'اختر الدور والفرع المطلوبين.' : 'Select a role and required branch.');
      return;
    }
    createUser.mutate();
  };

  const branchName = (branch: { nameAr: string; nameEn: string }) => isRtl ? branch.nameAr : branch.nameEn;

  return <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="page-heading"><div><span className="eyebrow">{isRtl ? 'إدارة الوصول' : 'Access management'}</span><h1>{isRtl ? 'إدارة الحسابات' : 'Account management'}</h1><p>{isRtl ? 'حسابات الموظفين والأدوار والفروع.' : 'Staff accounts, roles, and branch assignments.'}</p></div><button className="secondary-action" onClick={() => void userQuery.refetch()}><RefreshCw size={16} /> {isRtl ? 'تحديث' : 'Refresh'}</button></div>
    <div className="account-layout">
      <form className="surface-panel account-form" onSubmit={submit}>
        <div className="panel-heading"><div><span className="eyebrow">{isRtl ? 'حساب جديد' : 'New account'}</span><h2>{isRtl ? 'إنشاء حساب' : 'Create account'}</h2></div><UserPlus size={20} /></div>
        <label className="input-label">{isRtl ? 'الاسم' : 'Name'}<input className="pos-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label className="input-label">{isRtl ? 'البريد الإلكتروني' : 'Email'}<input className="pos-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label className="input-label">{isRtl ? 'كلمة المرور' : 'Password'}<input className="pos-input" type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
        <label className="input-label">{isRtl ? 'رقم واتساب الإرسال' : 'WhatsApp sender number'}<input className="pos-input" value={form.whatsappSenderNumber} onChange={(event) => setForm({ ...form, whatsappSenderNumber: event.target.value })} /></label>
        <label className="input-label">{isRtl ? 'الدور' : 'Role'}<select className="pos-input" value={form.roleId} onChange={(event) => setForm({ ...form, roleId: event.target.value, branchId: '' })} required><option value="">{isRtl ? 'اختر الدور' : 'Select role'}</option>{roleQuery.data?.filter((role) => role.name !== 'customer').map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        {selectedRole?.name !== 'super_admin' && <label className="input-label">{isRtl ? 'الفرع' : 'Branch'}<select className="pos-input" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} required><option value="">{isRtl ? 'اختر الفرع' : 'Select branch'}</option>{branchQuery.data?.items.map((branch) => <option key={branch.id} value={branch.id}>{branchName(branch)}</option>)}</select></label>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-action" type="submit" disabled={createUser.isPending}>{createUser.isPending ? (isRtl ? 'جاري الإنشاء...' : 'Creating...') : (isRtl ? 'إنشاء الحساب' : 'Create account')}</button>
      </form>
      <div className="surface-panel"><div className="panel-heading"><div><span className="eyebrow">{isRtl ? 'الموظفون' : 'Staff directory'}</span><h2>{isRtl ? 'الحسابات الحالية' : 'Existing accounts'}</h2></div><span className="result-count">{userQuery.data?.total ?? 0}</span></div>{userQuery.isLoading && <div className="state-panel">{isRtl ? 'جاري التحميل...' : 'Loading...'}</div>}{userQuery.isError && <div className="state-panel" role="alert">{isRtl ? 'تعذر تحميل الحسابات.' : 'Could not load accounts.'}</div>}{!userQuery.isLoading && !userQuery.isError && <div className="customer-list">{userQuery.data?.items.map((user) => <article className="customer-row" key={user.id}><div className="customer-avatar"><UserPlus size={18} /></div><div className="customer-main"><strong>{user.name}</strong><span>{user.email}</span></div><div className="customer-stats"><span>{user.role.name}</span><span>{user.branch ? branchName(user.branch) : (isRtl ? 'كل الفروع' : 'All branches')}</span><span>{user.isActive ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}</span></div></article>)}</div>}</div>
    </div>
  </section>;
}
