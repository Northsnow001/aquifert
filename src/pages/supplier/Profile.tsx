import { useEffect, useState } from "react";
import { BadgeCheck, Building2, Save } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useSupplierText } from "./lang";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_META } from "@contracts/constants";
import { toast } from "sonner";

export default function SupplierProfile() {
  const t = useSupplierText();
  const profile = trpc.supplier.profile.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: "", phone: "", orgName: "", address: "", contactPerson: "", wechatId: "", bankDetails: "" });
  const [prefs, setPrefs] = useState({ whatsapp: true, wechat: true, email: true, sms: false });

  useEffect(() => {
    const d = profile.data;
    if (d) {
      setForm({
        name: d.user.name ?? "",
        phone: d.user.phone ?? "",
        orgName: d.organization?.name ?? "",
        address: d.organization?.address ?? "",
        contactPerson: d.organization?.contactPerson ?? "",
        wechatId: d.organization?.wechatId ?? "",
        bankDetails: d.organization?.bankDetails ?? "",
      });
    }
  }, [profile.data]);

  const update = trpc.supplier.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t("Profile saved", "资料已保存"));
      utils.supplier.profile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const PREF_ITEMS = [
    { key: "whatsapp" as const, en: "WhatsApp notifications", zh: "WhatsApp 通知", descEn: "New quote requests & order updates", descZh: "新询价请求与订单更新" },
    { key: "wechat" as const, en: "WeChat notifications", zh: "微信通知", descEn: "Delivered to your WeChat Work account", descZh: "发送至您的企业微信账号" },
    { key: "email" as const, en: "Email digest", zh: "邮件摘要", descEn: "Daily summary of inbox activity", descZh: "每日收件箱活动摘要" },
    { key: "sms" as const, en: "SMS alerts", zh: "短信提醒", descEn: "Urgent shipment issues only", descZh: "仅紧急装运问题" },
  ];

  return (
    <div>
      <PageHeader
        title={t("Profile & Settings", "资料与设置")}
        description={t("Keep your company details current, they appear on quotes and invoices.", "保持公司信息最新, 这些信息将显示在报价单和发票上。")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-navy dark:text-navy-100" /> {t("Company details", "公司信息")}
                {profile.data?.organization?.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                    <BadgeCheck className="h-3.5 w-3.5" /> {t("Verified supplier", "已认证供应商")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pf-org">{t("Company name", "公司名称")}</Label>
                <Input id="pf-org" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pf-contact">{t("Contact person", "联系人")}</Label>
                <Input id="pf-contact" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pf-name">{t("Your name", "您的姓名")}</Label>
                <Input id="pf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pf-phone">{t("Phone / WhatsApp", "电话 / WhatsApp")}</Label>
                <Input id="pf-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+86 138 0000 0000" />
              </div>
              <div>
                <Label htmlFor="pf-wechat">{t("WeChat ID", "微信号")}</Label>
                <Input id="pf-wechat" value={form.wechatId} onChange={(e) => setForm({ ...form, wechatId: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pf-address">{t("Registered address", "注册地址")}</Label>
                <Input id="pf-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pf-bank">{t("Bank details (for payouts)", "银行账户信息（用于收款）")}</Label>
                <Textarea id="pf-bank" rows={3} value={form.bankDetails} onChange={(e) => setForm({ ...form, bankDetails: e.target.value })} placeholder={t("Bank name, account name, account number, SWIFT…", "银行名称、户名、账号、SWIFT 代码…")} />
              </div>
              <div className="sm:col-span-2">
                <Button className="bg-navy hover:bg-navy-800 aqf-btn-press" disabled={update.isPending || !form.name} onClick={() => update.mutate(form)}>
                  <Save className="mr-1.5 h-4 w-4" /> {update.isPending ? t("Saving…", "保存中…") : t("Save changes", "保存修改")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">{t("Notification preferences", "通知偏好")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {PREF_ITEMS.map((p) => (
                <div key={p.key} className="flex items-center justify-between rounded-lg border border-border p-3.5">
                  <div>
                    <p className="text-sm font-semibold">{t(p.en, p.zh)}</p>
                    <p className="text-xs text-muted-foreground">{t(p.descEn, p.descZh)}</p>
                  </div>
                  <Switch
                    checked={prefs[p.key]}
                    onCheckedChange={(v) => {
                      setPrefs({ ...prefs, [p.key]: v });
                      toast.success(t("Preference saved", "偏好已保存"));
                    }}
                    aria-label={p.en}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">{t("Product catalog", "产品目录")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(profile.data?.catalog ?? []).map((c) => (
                <div key={c.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{PRODUCT_META[c.product].label}</p>
                    <span className="font-data text-[11px] text-muted-foreground">{PRODUCT_META[c.product].formula}</span>
                  </div>
                  {c.specSheet && <p className="mt-1 text-xs text-muted-foreground">{c.specSheet}</p>}
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                {t("Catalog changes are reviewed by the AQUIFERT operations team, contact support to add products.", "目录变更由 AQUIFERT 运营团队审核, 请联系客服添加产品。")}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-navy to-navy-800 text-white">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">{t("Need help?", "需要帮助？")}</p>
              <p className="mt-2 text-sm text-white/80">
                {t("Your account manager replies within 4 business hours on WhatsApp, WeChat or email.", "您的客户经理会在 4 个工作小时内通过 WhatsApp、微信或邮件回复。")}
              </p>
              <p className="mt-3 font-data text-sm font-semibold text-teal-300">suppliers@aquifert.com</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
