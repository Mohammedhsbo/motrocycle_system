"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import Link from "next/link";
import { User, Calendar, ShoppingBag, CreditCard, Bell, ArrowRight } from "lucide-react";

interface ReservationSummary {
  id: string;
  reservationNumber: string;
  status: "active" | "converted" | "expired" | "cancelled";
  motorcycle: {
    model: string;
    brand: { nameEn: string; nameAr: string };
  };
  totalPrice: number;
  paidAmount: number;
  expiresAt: string | null;
  createdAt: string;
}

export default function AccountPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/account");
      return;
    }
    if (user && isAuthenticated) {
      fetchDashboardData();
    }
  }, [user, isAuthenticated, authLoading, router]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const [reservationsRes, notifRes] = await Promise.all([
        apiClient.get<{ data: ReservationSummary[] }>(
          `/customers/${user.id}/reservations?limit=3&sort=createdAt&order=desc`
        ).catch(() => ({ data: [] })),
        apiClient.get<{ count: number }>("/notifications/unread-count").catch(() => ({ count: 0 })),
      ]);
      setReservations(reservationsRes.data || []);
      setUnreadCount(notifRes.count || 0);
    } catch (err) {
      if (err instanceof ApiError) console.error("Dashboard load error:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR" }).format(amount);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <User size={28} className="text-white" />
          </div>
          <div>
            <p className="text-zinc-300 text-sm">Welcome back</p>
            <h1 className="text-2xl font-black">{user?.name ?? "Customer"}</h1>
            <p className="text-zinc-400 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Reservations", href: "/account/reservations", icon: Calendar, color: "text-blue-600 bg-blue-50" },
          { label: "Orders", href: "/account/orders", icon: ShoppingBag, color: "text-emerald-600 bg-emerald-50" },
          { label: "Financing", href: "/account/financing", icon: CreditCard, color: "text-purple-600 bg-purple-50" },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link key={href} href={href} className="group">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
                  <Icon size={20} />
                </div>
                <p className="text-sm font-semibold text-zinc-700 group-hover:text-zinc-950 transition-colors">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Reservations</CardTitle>
            <Link href="/account/reservations" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold">
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={40} className="text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 mb-4">No reservations yet</p>
              <Link href="/motorcycles">
                <Button>Browse Motorcycles</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((r) => (
                <Link key={r.id} href={`/account/reservations/${r.id}`} className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 transition-colors">
                    <div>
                      <p className="font-bold text-zinc-900">
                        {r.motorcycle.brand.nameEn} {r.motorcycle.model}
                      </p>
                      <p className="text-sm text-zinc-500">#{r.reservationNumber} · {formatDate(r.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ReservationStatusBadge status={r.status} />
                      <p className="text-sm font-semibold text-zinc-700">{formatCurrency(r.totalPrice)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {[
              { label: "Edit Profile", href: "/account/profile" },
              { label: "Manage Addresses", href: "/account/addresses" },
              { label: "Change Password", href: "/account/change-password" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
              >
                <span className="text-sm font-medium text-zinc-700">{label}</span>
                <ArrowRight size={16} className="text-zinc-400" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
