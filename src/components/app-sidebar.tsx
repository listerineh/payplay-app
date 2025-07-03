
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Globe, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useI18n } from '@/context/i18n-context';
import { cn } from '@/lib/utils';
import React from 'react';

const navLinks = [
  { href: '/', i18nKey: 'sidebar.dashboard' },
  { href: '/saving-rooms', i18nKey: 'sidebar.saving_rooms' },
  { href: '/transactions', i18nKey: 'sidebar.transactions' },
];

const USFlagIcon = () => (
    <svg className="mr-2 h-4 w-5 rounded-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3">
        <rect width="5" height="3" fill="#fff"/>
        <path d="M0,0.5 H5 M0,1.5 H5 M0,2.5 H5" stroke="#B22234" strokeWidth="0.5"/>
        <rect width="2" height="1.5" fill="#3C3B6E"/>
    </svg>
);

const SpainFlagIcon = () => (
    <svg className="mr-2 h-4 w-5 rounded-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2">
        <path fill="#C60B1E" d="M0 0h3v2H0z"/>
        <path fill="#FFC400" d="M0 .5h3v1H0z"/>
    </svg>
);

export function AppNavbar() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const [isMobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navLinks.map((link) => {
        const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              'transition-colors hover:text-primary',
              isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
              mobile && 'text-lg font-medium py-2'
            )}
          >
            {t(link.i18nKey)}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="flex flex-col gap-6 p-6">
                <Link href="/" className="mb-4 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Image
                    src="/favicon.svg"
                    alt="PayPlay"
                    width={32}
                    height={32}
                    />
                  <span className="font-bold">PayPlan</span>
                </Link>
                <NavContent mobile={true} />
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Nav */}
        <div className="hidden flex-1 items-center md:flex">
          <Link href="/" className="mr-6 flex items-center gap-2">
            <Image
              src="/favicon.svg"
              alt="PayPlay"
              width={32}
              height={32}
              />
            <span className="font-bold">PayPlan</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <NavContent />
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Globe className="size-5" />
                  <span className="sr-only">Change language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocale('en')} disabled={locale === 'en'}>
                  <USFlagIcon />
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('es')} disabled={locale === 'es'}>
                  <SpainFlagIcon />
                  Español
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-8 rounded-full">
                  <Avatar className="size-8">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                 <DropdownMenuLabel className="font-normal">
                    <div className="text-sm font-medium">{user?.displayName || 'User'}</div>
                    <div className="text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  <span>{t('sidebar.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
