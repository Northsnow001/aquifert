"use client";

import type { AnchorHTMLAttributes } from "react";
import { Link } from "@/marketing/router";

/** A link whose address comes from the content editor: site pages route in-app, web addresses open in a new tab. */
export function SiteLink({ href, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }) {
  if (href.startsWith("/") && !href.startsWith("//")) return <Link to={href} {...rest} />;
  if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer" {...rest} />;
  return <a href={href} {...rest} />;
}
