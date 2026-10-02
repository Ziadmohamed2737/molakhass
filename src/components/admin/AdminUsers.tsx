import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Shield,
  UserCheck,
  UserX,
  X,
  AlertCircle,
  Trash2,
  UserPlus,
  Lock,
  Phone,
  Sparkles,
  KeyRound
} from "lucide-react";
import { User, Year, Specialization } from "../../types";
import { apiRequest } from "../../api/client";
import { ConfirmModal } from "../common/ConfirmModal";
import { EmptyState } from "../common/EmptyState";

interface AdminUsersProps {
  years: Year[];
  specializations: Specialization[];
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ years, specializations }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSpec, setFilterSpec] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Create Moderator modal state
  const [isCreateModeratorOpen, setIsCreateModeratorOpen] = useState(false);
  const [modName, setModName] = useState("");
  const [modPhone, setModPhone] = useState("");
  const [modCode, setModCode] = useState("");
  const [modPassword, setModPassword] = useState("");
  const [modError, setModError] = useState<string | null>(null);
  const [isCreatingMod, setIsCreatingMod] = useState(false);

  // Edit user modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSpec, setEditSpec] = useState("");
  const [editRole, setEditRole] = useState<"student" | "admin" | "moderator">("student");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Toggle status target
  const [toggleStatusTarget, setToggleStatusTarget] = useState<User | null>(null);

  // Permanent Delete target
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [actionNotification, setActionNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = `/api/admin/users?limit=100`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterYear) url += `&year_id=${filterYear}`;
      if (filterSpec) url += `&specialization_id=${filterSpec}`;
      if (filterRole) url += `&role=${filterRole}`;

      const res = await apiRequest<{ users: User[] }>(url);
      setUsers(res.users || []);
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterYear, filterSpec, filterRole]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  // Create new supervisor/moderator
  const handleCreateModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setModError(null);
    if (!modName || !modPhone || !modCode || !modPassword) {
      setModError("جميع الحقول مطلوبة لإنشاء حساب المشرف");
      return;
    }

    setIsCreatingMod(true);
    try {
      await apiRequest("/api/admin/moderators", {
        method: "POST",
        body: JSON.stringify({
          full_name: modName.trim(),
          phone: modPhone.trim(),
          student_code: modCode.trim(),
          password: modPassword.trim(),
        }),
      });

      setIsCreateModeratorOpen(false);
      setModName("");
      setModPhone("");
      setModCode("");
      setModPassword("");
      await fetchUsers();
    } catch (err: any) {
      setModError(err.message || "فشل إنشاء حساب المشرف");
    } finally {
      setIsCreatingMod(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditName(u.full_name);
    setEditPhone(u.phone);
    setEditYear(u.year_id || "fourth");
    setEditSpec(u.specialization_id || "");
    setEditRole(u.role);
    setEditError(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    setEditError(null);

    try {
      await apiRequest(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: editName.trim(),
          phone: editPhone.trim(),
          year_id: editYear,
          specialization_id: editYear === "prep" ? null : editSpec,
          role: editRole,
        }),
      });

      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      setEditError(err.message || "فشل تحديث بيانات المستخدم");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!toggleStatusTarget) return;

    try {
      const nextStatus = toggleStatusTarget.is_active === 1 ? 0 : 1;
      await apiRequest(`/api/admin/users/${toggleStatusTarget.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextStatus }),
      });

      setToggleStatusTarget(null);
      await fetchUsers();
      setActionNotification({ type: "success", text: "تم تحديث حالة حساب المستخدم بنجاح" });
      setTimeout(() => setActionNotification(null), 4000);
    } catch (err: any) {
      setActionNotification({ type: "error", text: err.message || "فشل تعديل حالة الحساب" });
      setTimeout(() => setActionNotification(null), 4000);
    }
  };

  const handleDeleteUserConfirmed = async () => {
    if (!deleteUserTarget) return;

    try {
      await apiRequest(`/api/admin/users/${deleteUserTarget.id}`, {
        method: "DELETE",
      });

      setDeleteUserTarget(null);
      await fetchUsers();
      setActionNotification({ type: "success", text: "تم حذف حساب المستخدم نهائياً بنجاح" });
      setTimeout(() => setActionNotification(null), 4000);
    } catch (err: any) {
      setActionNotification({ type: "error", text: err.message || "فشل حذف حساب المستخدم نهائياً" });
      setTimeout(() => setActionNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {actionNotification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
            actionNotification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{actionNotification.text}</span>
          <button
            onClick={() => setActionNotification(null)}
            className="text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer font-normal"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header with Title and Add Supervisor Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">إدارة الطلاب والمشرفين</h2>
          <p className="text-xs text-slate-500">
            متابعة حسابات الطلاب، إنشاء حسابات مشرفي المحتوى، تفعيل أو تعطيل الحسابات، وحذف الحسابات نهائياً.
          </p>
        </div>

        <button
          onClick={() => {
            setModError(null);
            setIsCreateModeratorOpen(true);
          }}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة حساب مشرف جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم، كود الطالب، أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            بحث
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Filter Role */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:border-indigo-500 focus:outline-hidden cursor-pointer"
          >
            <option value="">جميع الأدوار</option>
            <option value="student">الطلاب فقط</option>
            <option value="moderator">مشرفي المحتوى</option>
            <option value="admin">المدير الأساسي</option>
          </select>

          {/* Filter Year */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:border-indigo-500 focus:outline-hidden cursor-pointer"
          >
            <option value="">جميع الفرق</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table or Empty State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">جاري تحميل بيانات المستخدمين...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8">
          <EmptyState
            title="لا يوجد مستخدمون مطابقون"
            description="لم يتم العثور على أي مستخدم يطابق معايير البحث أو الفلترة المحددة."
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-bold">
                <tr>
                  <th className="py-3.5 px-4">المستخدم</th>
                  <th className="py-3.5 px-4">كود الدخول</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">الفرقة والتخصص</th>
                  <th className="py-3.5 px-4">الدور والصلاحية</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => {
                  const isPrimaryAdmin = u.student_code === "20250000";
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isPrimaryAdmin
                              ? "bg-indigo-600 text-white"
                              : u.role === "moderator"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{u.full_name}</span>
                            <span className="text-[10px] text-slate-400">
                              انضم {u.created_at ? new Date(u.created_at).toLocaleDateString("ar-EG") : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {u.student_code}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {u.phone}
                      </td>

                      {/* Year & Spec */}
                      <td className="py-3.5 px-4">
                        <span className="block font-medium text-slate-800">{u.year_name || "إعدادي"}</span>
                        {u.spec_name && (
                          <span className="text-[10px] text-indigo-600 font-semibold block">{u.spec_name}</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isPrimaryAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            المدير الأساسي
                          </span>
                        ) : u.role === "moderator" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                            مشرف محتوى
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                            طالب
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.is_active === 1 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            مفعل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            معطل
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Toggle Active Status */}
                          {!isPrimaryAdmin && (
                            <button
                              onClick={() => setToggleStatusTarget(u)}
                              title={u.is_active === 1 ? "تعطيل الحساب" : "تفعيل الحساب"}
                              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                u.is_active === 1
                                  ? "text-amber-600 hover:bg-amber-50"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {u.is_active === 1 ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Edit User */}
                          <button
                            onClick={() => openEditModal(u)}
                            title="تعديل بيانات الحساب"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Permanent Delete (Disabled for primary admin) */}
                          {!isPrimaryAdmin && (
                            <button
                              onClick={() => setDeleteUserTarget(u)}
                              title="حذف الحساب نهائياً من قاعدة البيانات"
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Supervisor (Moderator) */}
      {isCreateModeratorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">إنشاء حساب مشرف محتوى جديد</h3>
              </div>
              <button
                onClick={() => setIsCreateModeratorOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modError && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modError}</span>
              </div>
            )}

            <form onSubmit={handleCreateModerator} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم المشرف بالكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. أحمد محمد"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">كود الدخول (اسم المستخدم)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 20261010"
                  value={modCode}
                  onChange={(e) => setModCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم الهاتف (واتساب)</label>
                <input
                  type="tel"
                  required
                  placeholder="010XXXXXXXX"
                  value={modPhone}
                  onChange={(e) => setModPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">كلمة المرور</label>
                <input
                  type="password"
                  required
                  placeholder="كلمة مرور قوية لا تقل عن 4 خانات"
                  value={modPassword}
                  onChange={(e) => setModPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                مشرف المحتوى يمتلك صلاحية رفع وتعديل وإدارة المحاضرات والسكاشن والشيتات والكويزات فقط، ويظهر في لوحة الإدارة اسم المشرف الذي قام برفع كل ملف، بينما لا يظهر للطلاب.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModeratorOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMod}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isCreatingMod ? "جاري الإنشاء..." : "إنشاء حساب المشرف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">تعديل بيانات المستخدم</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">الاسم بالكامل</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الفرقة الدراسية</label>
                  <select
                    value={editYear}
                    onChange={(e) => {
                      setEditYear(e.target.value);
                      if (e.target.value === "prep") setEditSpec("");
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  >
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">التخصص</label>
                  <select
                    value={editSpec}
                    onChange={(e) => setEditSpec(e.target.value)}
                    disabled={editYear === "prep"}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden disabled:opacity-40"
                  >
                    <option value="">بدون تخصص</option>
                    {specializations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">الدور والصلاحية</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="student">طالب (واجهة الطلاب فقط)</option>
                  <option value="moderator">مشرف محتوى (لوحة الإدارة - رفع وتحكم بالمحتوى)</option>
                  <option value="admin">مدير النظام (صلاحيات كاملة)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Active/Inactive toggle */}
      <ConfirmModal
        isOpen={!!toggleStatusTarget}
        title={toggleStatusTarget?.is_active === 1 ? "تعطيل حساب المستخدم" : "تفعيل حساب المستخدم"}
        message={
          toggleStatusTarget?.is_active === 1
            ? `هل أنت متأكد من تعطيل حساب الطالب "${toggleStatusTarget?.full_name}"؟ لن يتمكن من تسجيل الدخول حتى إعادة تفعيله.`
            : `هل أنت متأكد من تفعيل حساب الطالب "${toggleStatusTarget?.full_name}" والسماح له بالدخول؟`
        }
        confirmText={toggleStatusTarget?.is_active === 1 ? "نعم، تعطيل الحساب" : "نعم، تفعيل الحساب"}
        cancelText="إلغاء"
        isDanger={toggleStatusTarget?.is_active === 1}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setToggleStatusTarget(null)}
      />

      {/* Permanent Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteUserTarget}
        title="حذف حساب الطالب نهائياً"
        message={`تحذير هام: هل أنت متأكد من حذف حساب الطالب "${deleteUserTarget?.full_name}" نهائياً من قاعدة البيانات؟ سيتم حذف جميع محاولات الكويزات وإجاباته وبياناته بشكل لا رجعة فيه.`}
        confirmText="نعم، حذف الحساب نهائياً"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleDeleteUserConfirmed}
        onCancel={() => setDeleteUserTarget(null)}
      />
    </div>
  );
};
