"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { Logo } from "@/marketing/components/shared/Logo";
import { Button } from "@/marketing/components/ui/button";
import { SUPPLIER_PRODUCTS, normaliseSupplierCode, type SupplierChannel } from "@/lib/suppliers/registration";

const QR_SRC = "/brand/wechat-qr.png";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";

type TextFields = "code" | "email" | "company" | "country" | "contact" | "load_ports" | "website";

function Label({ htmlFor, en, zh }: { htmlFor?: string; en: string; zh: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-navy-900">
      {en} <span className="font-normal text-slate-500">/ {zh}</span>
    </label>
  );
}

function CodeChip({ code }: { code: string }) {
  return (
    <span className="rounded-md bg-navy-900 px-2 py-0.5 font-mono text-[13px] font-semibold tracking-wide text-white">
      {code || "SUP-001"}
    </span>
  );
}

export default function SupplierRegistration({ code: initialCode, email: initialEmail }: { code: string; email: string }) {
  const [form, setForm] = useState<Record<TextFields, string>>({
    code: normaliseSupplierCode(initialCode),
    email: initialEmail.trim(),
    company: "",
    country: "",
    contact: "",
    load_ports: "",
    website: "",
  });
  const [products, setProducts] = useState<string[]>([]);
  const [channel, setChannel] = useState<SupplierChannel>("wechat");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ company: string; code: string } | null>(null);

  const set = (key: TextFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleProduct = (value: string) =>
    setProducts((list) => (list.includes(value) ? list.filter((p) => p !== value) : [...list, value]));
  const code = normaliseSupplierCode(form.code);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!products.length) {
      setError("Choose at least one product. / 请至少选择一种产品。");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/supplier-registration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, code, products, channel, consent }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) throw new Error(data.error || "We could not save your registration. Please try again.");
      setDone({ company: form.company.trim(), code: data.code || code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your registration. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Logo size={36} />
          <span className="rounded-full bg-teal-50 px-3 py-1 text-[12px] font-semibold text-teal-700">
            Supplier registration / 供应商注册
          </span>
        </header>

        <div className="mt-8 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Register as an Aquifert supplier</h1>
          <p className="mt-1 text-lg font-semibold text-slate-500">注册成为 Aquifert 供应商</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Aquifert Solution sources fertiliser for international buyers. Complete this short form and connect with us on
            WeChat so we can send you our weekly price requests. It takes about two minutes. Your details stay confidential
            and are never shared with buyers.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Aquifert Solution 为国际买家采购化肥。请填写此表格并关注我们的微信，以便我们每周向您发送询价。约需两分钟。您的信息将严格保密，绝不会透露给买家。
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {done ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-live="polite">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-navy-900">
                Thank you{done.company ? `, ${done.company}` : ""}. / 谢谢！
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Your details are saved. One last step: scan the WeChat QR code, follow Aquifert, and send{" "}
                <CodeChip code={done.code} /> in the chat. We will confirm your registration there.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                您的信息已保存。最后一步：请扫描微信二维码关注 Aquifert，并在对话中发送 <CodeChip code={done.code} />
                。我们将在微信中确认您的注册。
              </p>
            </section>
          ) : (
            <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sr-code" en="Supplier code" zh="供应商编号" />
                  <input
                    id="sr-code"
                    value={form.code}
                    onChange={set("code")}
                    className={`${inputCls} mt-1 font-mono uppercase`}
                    placeholder="SUP-001"
                    maxLength={20}
                    required
                  />
                  <p className="mt-1 text-[12px] text-slate-500">From our email / 见我们的邮件</p>
                </div>
                <div>
                  <Label htmlFor="sr-email" en="Email" zh="电子邮箱" />
                  <input
                    id="sr-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={set("email")}
                    className={`${inputCls} mt-1`}
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="sr-company" en="Company name" zh="公司名称" />
                  <input
                    id="sr-company"
                    autoComplete="organization"
                    value={form.company}
                    onChange={set("company")}
                    className={`${inputCls} mt-1`}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sr-country" en="Country" zh="国家" />
                  <input
                    id="sr-country"
                    autoComplete="country-name"
                    value={form.country}
                    onChange={set("country")}
                    className={`${inputCls} mt-1`}
                    placeholder="e.g. China"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sr-contact" en="Contact person" zh="联系人" />
                  <input
                    id="sr-contact"
                    autoComplete="name"
                    value={form.contact}
                    onChange={set("contact")}
                    className={`${inputCls} mt-1`}
                    required
                  />
                </div>
              </div>

              <fieldset className="mt-6">
                <legend className="text-[13px] font-semibold text-navy-900">
                  Products you supply <span className="font-normal text-slate-500">/ 供应产品</span>
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {SUPPLIER_PRODUCTS.map((p) => (
                    <label
                      key={p.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-navy-900 transition-colors hover:border-slate-300 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60"
                    >
                      <input
                        type="checkbox"
                        checked={products.includes(p.value)}
                        onChange={() => toggleProduct(p.value)}
                        className="h-4 w-4 accent-teal-600"
                      />
                      <span>
                        {p.value} <span className="text-slate-500">/ {p.zh}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-6">
                <Label htmlFor="sr-ports" en="Load ports" zh="装货港口" />
                <textarea
                  id="sr-ports"
                  value={form.load_ports}
                  onChange={set("load_ports")}
                  rows={2}
                  className={`${inputCls} mt-1 h-auto py-2.5`}
                  placeholder="e.g. Qingdao, Lianyungang"
                  required
                />
              </div>

              <fieldset className="mt-6">
                <legend className="text-[13px] font-semibold text-navy-900">
                  Preferred contact channel <span className="font-normal text-slate-500">/ 首选联系方式</span>
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["wechat", "WeChat", "微信"],
                      ["email", "Email", "电子邮件"],
                    ] as const
                  ).map(([value, en, zh]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-navy-900 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60"
                    >
                      <input
                        type="radio"
                        name="channel"
                        checked={channel === value}
                        onChange={() => setChannel(value)}
                        className="h-4 w-4 accent-teal-600"
                      />
                      {en} <span className="text-slate-500">/ {zh}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="sr-website">Website</label>
                <input id="sr-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg bg-slate-50 p-3.5 text-[13px] leading-relaxed text-slate-700">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600"
                  required
                />
                <span>
                  I agree that Aquifert may contact me on WeChat and by email about price requests and orders.
                  <span className="mt-0.5 block text-slate-500">我同意 Aquifert 通过微信和电子邮件就询价和订单与我联系。</span>
                </span>
              </label>

              {error ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" disabled={pending} className="mt-6 w-full bg-teal-500 text-white hover:bg-teal-400 sm:w-auto" size="lg">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Submit / 提交"}
              </Button>
            </form>
          )}

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center gap-2 text-teal-700">
              <ScanLine className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-bold tracking-tight text-navy-900">Connect on WeChat</h2>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-500">关注微信</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={QR_SRC}
              alt="Aquifert WeChat QR code"
              width={220}
              height={220}
              className="mx-auto mt-5 rounded-lg border border-slate-200 p-2"
            />
            <ol className="mt-5 space-y-3 text-[13px] leading-relaxed text-slate-700">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[12px] font-bold text-teal-700">1</span>
                <span>
                  Scan this code in WeChat and follow Aquifert.
                  <span className="block text-slate-500">用微信扫描二维码并关注 Aquifert。</span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[12px] font-bold text-teal-700">2</span>
                <span>
                  Send your supplier code in the chat: <CodeChip code={done?.code || code} />
                  <span className="block text-slate-500">在对话中发送您的供应商编号。</span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[12px] font-bold text-teal-700">3</span>
                <span>
                  We confirm your registration in WeChat.
                  <span className="block text-slate-500">我们将在微信中确认您的注册。</span>
                </span>
              </li>
            </ol>
            <p className="mt-5 rounded-lg bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600">
              On your phone? Take a screenshot, open WeChat, tap Scan, then choose the picture from Album.
              <span className="mt-0.5 block text-slate-500">使用手机？请截图，打开微信“扫一扫”，从相册中选择该图片。</span>
            </p>
          </aside>
        </div>

        <p className="mt-10 text-center text-[12px] text-slate-500">Aquifert Solution · Supplier network / 供应商网络</p>
      </div>
    </div>
  );
}
