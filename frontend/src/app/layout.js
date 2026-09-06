import "./globals.css";
import { Inter, Poppins, Lato, Montserrat, Roboto } from "next/font/google";
import ClientLocaleProvider from "@/components/ClientLocaleProvider";

import GlobalToast from "@/components/GlobalToast";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins" 
});
const lato = Lato({ 
  subsets: ["latin"], 
  weight: ["300", "400", "700"],
  variable: "--font-lato" 
});
const montserrat = Montserrat({ 
  subsets: ["latin"], 
  variable: "--font-montserrat" 
});
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto"
});

export const metadata = {
  title: "MSC Accounting",
  description: "Manage your taxes efficiently with MSC Accounting.",
};

const themeInitScript = `(function(){try{var s=localStorage.getItem('app_appearance_settings');if(!s)return;var t=JSON.parse(s);var r=document.documentElement;var f={'inter':'var(--font-inter)','poppins':'var(--font-poppins)','lato':'var(--font-lato)','montserrat':'var(--font-montserrat)','roboto':'var(--font-roboto)','times new roman':'"Times New Roman", serif'};if(t.theme==='custom'){if(t.text_color_body){r.style.setProperty('--text-body',t.text_color_body);r.style.setProperty('--card-foreground',t.text_color_body);r.style.setProperty('--popover-foreground',t.text_color_body);r.style.setProperty('--foreground',t.text_color_body);r.style.setProperty('--sidebar-foreground',t.text_color_body);r.style.setProperty('--sidebar-accent-foreground',t.text_color_body);}if(t.text_color_heading){r.style.setProperty('--text-heading',t.text_color_heading);}if(t.button_color_background_normal){r.style.setProperty('--btn-bg',t.button_color_background_normal);}if(t.button_color_text_normal){r.style.setProperty('--btn-text',t.button_color_text_normal);}}if(t.font_family){var fv=f[t.font_family.toLowerCase()]||f['inter'];r.style.setProperty('--font-primary',fv);}if(t.theme==='dark'){r.classList.add('dark');r.setAttribute('data-theme','dark');}else if(t.theme==='custom'){r.classList.remove('dark');r.setAttribute('data-theme','custom');}else{r.classList.remove('dark');r.setAttribute('data-theme','light');}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} ${poppins.variable} ${lato.variable} ${montserrat.variable} ${roboto.variable}`}>
        <ClientLocaleProvider>
          {children}
          <GlobalToast />
          <Toaster />
        </ClientLocaleProvider>
      </body>
    </html>
  );
}
