import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'wouter';
import { isInternalHref } from '@/lib/links';

export interface AppLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
}

/**
 * Router link for in-app paths (keeps navigation inside the installed app), plain anchor with
 * `rel="noopener"` opening a new context for external URLs such as service UIs.
 */
export function AppLink({ href, children, ...rest }: AppLinkProps) {
  if (isInternalHref(href)) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}
